import time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    AutocompleteResponse,
    AutocompleteSuggestion,
)
from backend.app.security.auth import get_optional_user
from backend.app.retrieval.trie import autocomplete_trie
from backend.app.retrieval.query_preprocessor import query_preprocessor
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.hybrid import hybrid_retriever
from backend.app.retrieval.ranking import custom_ranker
from backend.app.rag.embeddings import embedding_service

router = APIRouter(prefix="/search", tags=["Search & Retrieval"])


@router.post("/", response_model=SearchResponse)
async def search_documents(
    req: SearchRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search indexed knowledge base across Vector, Keyword, Hybrid (RRF), or Custom Ranked mode.
    Returns granular scores and source metadata.
    """
    start_time = time.perf_counter()
    normalized = query_preprocessor.normalize(req.query)

    if not normalized:
        return SearchResponse(
            query=req.query,
            mode=req.mode,
            total_results=0,
            latency_ms=0.0,
            results=[],
        )

    candidates = []
    user_id_filter = current_user.id if current_user else None

    if req.mode == "vector":
        q_vec = await embedding_service.embed_query(normalized)
        candidates = vector_store.search(
            query_vector=q_vec,
            top_k=req.top_k,
            filter_doc_id=req.document_id,
            filter_user_id=user_id_filter,
        )
    elif req.mode == "keyword":
        candidates = bm25_engine.search(
            query=normalized,
            top_k=req.top_k,
            filter_doc_id=req.document_id,
            filter_user_id=user_id_filter,
        )
    elif req.mode == "hybrid":
        candidates = await hybrid_retriever.retrieve(
            query=normalized,
            top_k=req.top_k,
            filter_doc_id=req.document_id,
            filter_user_id=user_id_filter,
        )
    elif req.mode == "ranked":
        initial = await hybrid_retriever.retrieve(
            query=normalized,
            top_k=req.top_k * 2,
            filter_doc_id=req.document_id,
            filter_user_id=user_id_filter,
        )
        candidates = custom_ranker.rank_candidates(
            query=normalized,
            candidates=initial,
            top_k=req.top_k,
        )
    else:
        candidates = await hybrid_retriever.retrieve(
            query=normalized,
            top_k=req.top_k,
            filter_doc_id=req.document_id,
            filter_user_id=user_id_filter,
        )

    latency_ms = (time.perf_counter() - start_time) * 1000.0

    items: List[SearchResultItem] = []
    for c in candidates:
        meta = c.get("metadata", {})
        text = meta.get("text", "")
        # Generate snippet
        snippet = text[:220] + "..." if len(text) > 220 else text

        items.append(SearchResultItem(
            chunk_id=str(c.get("chunk_id") or meta.get("chunk_id") or meta.get("document_id", "unknown")),
            document_id=meta.get("document_id", ""),
            document_title=meta.get("document_title", "Technical Resource"),
            text=text,
            snippet=snippet,
            score=c.get("score", 0.0),
            semantic_score=c.get("semantic_score"),
            keyword_score=c.get("keyword_score"),
            title_score=c.get("title_score"),
            freshness_score=c.get("freshness_score"),
            page_number=meta.get("page_number"),
            timestamp_seconds=meta.get("timestamp_seconds"),
            section=meta.get("section"),
            source_type=meta.get("source_type", "document"),
        ))

    return SearchResponse(
        query=req.query,
        mode=req.mode,
        total_results=len(items),
        latency_ms=round(latency_ms, 2),
        results=items,
    )


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(
    prefix: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=8, ge=1, le=20),
):
    """
    Sub-millisecond prefix autocomplete powered by custom in-memory Trie.
    Returns top technical terms and phrases matching the prefix.
    """
    start_time = time.perf_counter()
    suggestions_data = autocomplete_trie.prefix_search(prefix=prefix, limit=limit)
    latency_ms = (time.perf_counter() - start_time) * 1000.0

    suggestions = [
        AutocompleteSuggestion(
            word=s["word"],
            frequency=s["frequency"],
            score=round(1.0 / (1.0 + 1.0 / s["frequency"]), 3),
        )
        for s in suggestions_data
    ]

    return AutocompleteResponse(
        prefix=prefix,
        suggestions=suggestions,
        latency_ms=round(latency_ms, 3),
    )
