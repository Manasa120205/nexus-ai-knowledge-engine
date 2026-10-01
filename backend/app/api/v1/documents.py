import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.models.document import Document, DocumentChunk
from backend.app.schemas.document import (
    DocumentResponse,
    DocumentChunkResponse,
    YouTubeIngestRequest,
    IngestionJobResponse,
)
from backend.app.security.auth import get_current_user
from backend.app.ingestion.pipeline import ingestion_pipeline
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.cache.redis_cache import cache_manager

router = APIRouter(prefix="/documents", tags=["Knowledge Base & Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and ingest a technical document (PDF, Markdown, or plain text).
    Validates file extension, size limit, and extracts structural chunks.
    """
    filename = file.filename or "uploaded_document"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".pdf", ".txt", ".md", ".markdown"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. NEXUS supports .pdf, .txt, and .md files.",
        )

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB.",
        )

    source_type = "pdf" if ext == ".pdf" else ("markdown" if ext in (".md", ".markdown") else "text")
    doc_title = title.strip() if title and title.strip() else os.path.splitext(filename)[0]

    try:
        doc = await ingestion_pipeline.ingest_document(
            db=db,
            user_id=current_user.id,
            title=doc_title,
            source_type=source_type,
            raw_content=content_bytes,
        )
        
        # Evict cached RAG queries for this user
        await cache_manager.clear_user_namespace(current_user.id, "rag")

        # Fetch chunk count
        chunk_count = await db.execute(
            select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
        )
        count_val = chunk_count.scalar() or 0

        resp = DocumentResponse.model_validate(doc)
        resp.chunk_count = count_val
        return resp

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}",
        )


@router.post("/youtube", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def ingest_youtube_video(
    req: YouTubeIngestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingest a YouTube video transcript with segment timestamps.
    Fails gracefully if transcripts are disabled or network is offline.
    """
    doc_title = req.title.strip() if req.title and req.title.strip() else "YouTube Transcript"

    try:
        doc = await ingestion_pipeline.ingest_document(
            db=db,
            user_id=current_user.id,
            title=doc_title,
            source_type="youtube",
            source_url=req.url.strip(),
        )

        await cache_manager.clear_user_namespace(current_user.id, "rag")

        chunk_count = await db.execute(
            select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
        )
        count_val = chunk_count.scalar() or 0

        resp = DocumentResponse.model_validate(doc)
        resp.chunk_count = count_val
        return resp

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"YouTube ingestion failed: {str(e)}",
        )


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all documents owned by the authenticated user with chunk counts,
    including shared foundational knowledge base documents so accounts always have access to data.
    """
    DEMO_USER_ID = "3ccdcc89-d39c-4b6c-b2a9-05669881d0e5"
    stmt = (
        select(Document)
        .where(
            or_(
                Document.user_id == current_user.id,
                Document.user_id == DEMO_USER_ID,
                Document.user_id == "system",
            )
        )
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    documents = result.scalars().all()

    responses = []
    seen_titles = set()
    for d in documents:
        if d.title in seen_titles:
            continue
        seen_titles.add(d.title)
        cnt_res = await db.execute(
            select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == d.id)
        )
        cnt = cnt_res.scalar() or 0
        resp = DocumentResponse.model_validate(d)
        resp.chunk_count = cnt
        responses.append(resp)

    return responses


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve document details by ID, enforcing user isolation or shared knowledge access."""
    DEMO_USER_ID = "3ccdcc89-d39c-4b6c-b2a9-05669881d0e5"
    stmt = select(Document).where(
        Document.id == document_id,
        or_(
            Document.user_id == current_user.id,
            Document.user_id == DEMO_USER_ID,
            Document.user_id == "system",
        )
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    cnt_res = await db.execute(
        select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
    )
    cnt = cnt_res.scalar() or 0
    resp = DocumentResponse.model_validate(doc)
    resp.chunk_count = cnt
    return resp


@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List structural chunks for a specific document."""
    DEMO_USER_ID = "3ccdcc89-d39c-4b6c-b2a9-05669881d0e5"
    # Verify ownership or shared knowledge access
    doc_res = await db.execute(
        select(Document).where(
            Document.id == document_id,
            or_(
                Document.user_id == current_user.id,
                Document.user_id == DEMO_USER_ID,
                Document.user_id == "system",
            )
        )
    )
    if not doc_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunk_stmt = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
    )
    chunks = (await db.execute(chunk_stmt)).scalars().all()
    return chunks


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document and its chunks from DB and in-memory search indices.
    Enforces user isolation.
    """
    stmt = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Remove chunks from vector store and BM25 index
    chunk_res = await db.execute(
        select(DocumentChunk.id).where(DocumentChunk.document_id == document_id)
    )
    chunk_ids = chunk_res.scalars().all()

    for cid in chunk_ids:
        vector_store.delete_vector(cid)
        bm25_engine.remove_chunk(cid)

    await db.delete(doc)
    await db.commit()

    # Clear user cache
    await cache_manager.clear_user_namespace(current_user.id, "rag")
    return None
