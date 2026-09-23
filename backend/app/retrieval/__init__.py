import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.document import DocumentChunk
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.trie import autocomplete_trie
from backend.app.core.logging import logger


async def warmup_indices(session: AsyncSession) -> int:
    """Loads all persisted document chunks into vector store, BM25 inverted index, and Autocomplete Trie."""
    stmt = select(DocumentChunk)
    result = await session.execute(stmt)
    chunks = result.scalars().all()

    for ch in chunks:
        meta = {
            "document_id": ch.document_id,
            "document_title": ch.chunk_metadata.get("document_title", "Technical Document"),
            "text": ch.text,
            "section": ch.section,
            "page_number": ch.page_number,
            "timestamp_seconds": ch.timestamp_seconds,
            "source_type": ch.source_type,
            "created_at_ts": ch.created_at.timestamp() if ch.created_at else time.time(),
        }
        if ch.embedding:
            vector_store.add_vector(ch.id, ch.embedding, meta)
        bm25_engine.index_chunk(ch.id, ch.text, meta)
        autocomplete_trie.populate_from_text(ch.text)

    logger.info(f"Warmed up indices with {len(chunks)} chunks.")
    return len(chunks)
