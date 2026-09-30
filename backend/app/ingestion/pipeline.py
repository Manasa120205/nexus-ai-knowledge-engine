import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import logger
from backend.app.models.document import Document, DocumentChunk, DocumentVersion, IngestionJob
from backend.app.ingestion.chunker import chunker
from backend.app.ingestion.pdf_extractor import PDFExtractor
from backend.app.ingestion.youtube_extractor import YouTubeExtractor
from backend.app.rag.embeddings import embedding_service
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.trie import autocomplete_trie


class IngestionPipeline:
    """
    Coordinates document processing from extraction and hashing
    through structure-aware chunking, vector embedding, and inverted indexing.
    """

    @classmethod
    def compute_hash(cls, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    async def ingest_document(
        self,
        db: AsyncSession,
        user_id: str,
        title: str,
        source_type: str,
        raw_content: Optional[bytes] = None,
        source_url: Optional[str] = None,
        raw_text: Optional[str] = None,
    ) -> Document:
        """
        Executes end-to-end ingestion job with duplicate detection, chunking, and dual indexing.
        """
        # Determine content bytes for hashing
        if raw_content:
            content_bytes = raw_content
        elif raw_text:
            content_bytes = raw_text.encode("utf-8")
        elif source_url:
            content_bytes = source_url.encode("utf-8")
        else:
            raise ValueError("No content or source provided for ingestion.")

        content_hash = self.compute_hash(content_bytes)

        # 1. Duplicate Detection for this user
        existing_stmt = select(Document).where(
            Document.user_id == user_id,
            Document.content_hash == content_hash,
        )
        existing_doc_res = await db.execute(existing_stmt)
        existing_doc = existing_doc_res.scalar_one_or_none()

        if existing_doc and existing_doc.status == "completed":
            logger.info(f"Duplicate document detected for user {user_id}. Document ID: {existing_doc.id}")
            # Add new version entry to record re-upload attempt without re-indexing
            version_stmt = select(DocumentVersion).where(DocumentVersion.document_id == existing_doc.id)
            versions = (await db.execute(version_stmt)).scalars().all()
            new_version = DocumentVersion(
                document_id=existing_doc.id,
                version_number=len(versions) + 1,
                content_hash=content_hash,
                file_size=len(content_bytes),
                change_summary=f"Re-uploaded at {datetime.now(timezone.utc).isoformat()}",
            )
            db.add(new_version)
            await db.commit()
            return existing_doc

        # 2. Create Document and IngestionJob records
        doc = Document(
            user_id=user_id,
            title=title,
            source_type=source_type,
            source_url=source_url,
            content_hash=content_hash,
            file_size=len(content_bytes),
            status="processing",
            doc_metadata={"ingested_at": datetime.now(timezone.utc).isoformat()},
        )
        db.add(doc)
        await db.flush()

        job = IngestionJob(
            document_id=doc.id,
            user_id=user_id,
            status="processing",
            progress_pct=10,
            started_at=datetime.now(timezone.utc),
        )
        db.add(job)
        await db.flush()

        try:
            # 3. Structural Extraction
            elements: List[Dict[str, Any]] = []
            if source_type == "pdf":
                elements = PDFExtractor.extract_from_bytes(content_bytes)
            elif source_type == "youtube":
                if not source_url:
                    raise ValueError("YouTube source requires a valid video URL.")
                yt_title, elements = YouTubeExtractor.extract_transcript(source_url)
                if not title or title.startswith("YouTube Video"):
                    doc.title = yt_title
            elif source_type in ("text", "markdown"):
                text_str = content_bytes.decode("utf-8", errors="replace")
                elements = [{
                    "text": text_str,
                    "page_number": None,
                    "section": "Main",
                    "timestamp_seconds": None,
                }]
            else:
                raise ValueError(f"Unsupported source type: {source_type}")

            if not elements:
                raise ValueError("No text could be extracted from the document.")

            job.progress_pct = 40
            await db.flush()

            # 4. Structure-aware Chunking
            chunks_data = chunker.chunk_structured_elements(
                elements=elements,
                document_id=doc.id,
                source_type=source_type,
            )

            if not chunks_data:
                raise ValueError("Document contains no valid text paragraphs to index.")

            job.progress_pct = 60
            await db.flush()

            # 5. Batch Embeddings Generation
            chunk_texts = [c["text"] for c in chunks_data]
            embeddings = await embedding_service.embed_documents(chunk_texts)

            job.progress_pct = 80
            await db.flush()

            # 6. Database Chunks & In-Memory Indices Population
            db_chunks: List[DocumentChunk] = []
            created_ts = datetime.now(timezone.utc).timestamp()

            for idx, c in enumerate(chunks_data):
                emb = embeddings[idx] if idx < len(embeddings) else None
                chunk_id = str(uuid.uuid4())
                chunk_record = DocumentChunk(
                    id=chunk_id,
                    document_id=doc.id,
                    chunk_index=c["chunk_index"],
                    text=c["text"],
                    page_number=c["page_number"],
                    section=c["section"],
                    timestamp_seconds=c["timestamp_seconds"],
                    source_type=c["source_type"],
                    token_count=c["token_count"],
                    embedding=emb,
                    chunk_metadata={
                        "document_title": doc.title,
                        "document_id": doc.id,
                        "user_id": user_id,
                    },
                )
                db.add(chunk_record)
                db_chunks.append(chunk_record)

                chunk_meta = {
                    "document_id": doc.id,
                    "document_title": doc.title,
                    "user_id": user_id,
                    "text": c["text"],
                    "section": c["section"],
                    "page_number": c["page_number"],
                    "timestamp_seconds": c["timestamp_seconds"],
                    "source_type": c["source_type"],
                    "created_at_ts": created_ts,
                }

                # Index in vector store
                if emb:
                    vector_store.add_vector(
                        chunk_id=chunk_id,
                        vector=emb,
                        metadata=chunk_meta,
                    )

                # Index in BM25 keyword engine
                bm25_engine.index_chunk(
                    chunk_id=chunk_id,
                    text=c["text"],
                    metadata=chunk_meta,
                )

                # Populate Autocomplete Trie with technical tokens
                autocomplete_trie.populate_from_text(c["text"])

            # Also add document title to Trie
            autocomplete_trie.insert(doc.title, frequency=5)

            # Record initial version
            init_version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                content_hash=content_hash,
                file_size=len(content_bytes),
                change_summary="Initial ingestion",
            )
            db.add(init_version)

            # Finalize Status
            doc.status = "completed"
            job.status = "completed"
            job.progress_pct = 100
            job.completed_at = datetime.now(timezone.utc)

            await db.commit()
            await db.refresh(doc)
            logger.info(f"Ingestion succeeded for document {doc.id} ('{doc.title}') with {len(db_chunks)} chunks.")
            return doc

        except Exception as e:
            logger.error(f"Ingestion failed for document {doc.id}: {e}")
            await db.rollback()
            # Update failed status in a fresh transaction
            doc.status = "failed"
            doc.error_message = str(e)
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.add(doc)
            db.add(job)
            await db.commit()
            raise


ingestion_pipeline = IngestionPipeline()
