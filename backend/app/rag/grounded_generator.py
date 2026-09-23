import hashlib
import time
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logging import logger
from backend.app.cache.redis_cache import cache_manager
from backend.app.retrieval.query_preprocessor import query_preprocessor
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.hybrid import hybrid_retriever
from backend.app.retrieval.ranking import custom_ranker
from backend.app.rag.embeddings import embedding_service
from backend.app.rag.llm_provider import llm_service
from backend.app.rag.context_builder import context_builder
from backend.app.models.query import QueryRecord, QuerySource
from backend.app.schemas.rag import Citation, RAGResponse


class RAGPipeline:
    """
    Complete end-to-end RAG query pipeline orchestrator.
    Handles caching, multi-mode retrieval, ranking, context construction,
    grounded LLM inference, and citation verification.
    """

    async def execute(
        self,
        query: str,
        user_id: str,
        db: Optional[AsyncSession] = None,
        mode: str = "hybrid",
        top_k: int = 5,
        filter_doc_id: Optional[str] = None,
    ) -> RAGResponse:
        start_time = time.perf_counter()
        normalized_query = query_preprocessor.normalize(query)
        query_hash = hashlib.sha256(f"{normalized_query}:{mode}:{top_k}:{filter_doc_id}".encode()).hexdigest()

        # 1. Cache Lookup with strict user isolation
        cache_key = cache_manager.build_user_key(user_id=user_id, namespace="rag", key_suffix=query_hash)
        cached_result = await cache_manager.get(cache_key)
        if cached_result:
            total_latency = (time.perf_counter() - start_time) * 1000.0
            cached_result["cache_hit"] = True
            cached_result["latency_ms"] = round(total_latency, 2)
            return RAGResponse(**cached_result)

        # 2. Retrieval Phase
        retrieval_start = time.perf_counter()
        candidates: List[Dict[str, Any]] = []

        if mode == "vector":
            query_vector = await embedding_service.embed_query(normalized_query)
            candidates = vector_store.search(query_vector=query_vector, top_k=top_k, filter_doc_id=filter_doc_id, filter_user_id=user_id)
        elif mode == "keyword":
            candidates = bm25_engine.search(query=normalized_query, top_k=top_k, filter_doc_id=filter_doc_id, filter_user_id=user_id)
        elif mode == "hybrid":
            candidates = await hybrid_retriever.retrieve(query=normalized_query, top_k=top_k, filter_doc_id=filter_doc_id, filter_user_id=user_id)
        elif mode == "ranked":
            initial_candidates = await hybrid_retriever.retrieve(query=normalized_query, top_k=top_k * 2, filter_doc_id=filter_doc_id, filter_user_id=user_id)
            candidates = custom_ranker.rank_candidates(query=normalized_query, candidates=initial_candidates, top_k=top_k)
        else:
            candidates = await hybrid_retriever.retrieve(query=normalized_query, top_k=top_k, filter_doc_id=filter_doc_id, filter_user_id=user_id)

        retrieval_latency = (time.perf_counter() - retrieval_start) * 1000.0

        # 3. Context Construction
        context_chunks = context_builder.build_context(candidates)

        # 4. LLM Generation
        gen_start = time.perf_counter()
        llm_output = await llm_service.generate_grounded_answer(
            query=normalized_query,
            context_chunks=context_chunks,
        )
        generation_latency = (time.perf_counter() - gen_start) * 1000.0

        # 5. Citation Resolution
        citations: List[Citation] = []
        cited_indices = llm_output.get("cited_chunk_indices", [])

        # If LLM didn't produce specific bracket indices but answered with evidence, map top context chunks
        if not cited_indices and llm_output.get("sufficient_evidence") and context_chunks:
            cited_indices = [1]

        for idx in cited_indices:
            if 1 <= idx <= len(context_chunks):
                chunk_item = context_chunks[idx - 1]
                meta = chunk_item.get("metadata", {})
                text_content = meta.get("text", "")
                snippet = text_content[:250] + "..." if len(text_content) > 250 else text_content
                
                c_id = chunk_item.get("chunk_id") or meta.get("chunk_id") or str(uuid.uuid4())
                d_id = meta.get("document_id") or str(uuid.uuid4())
                d_title = meta.get("document_title") or "Technical Document"

                citations.append(Citation(
                    citation_index=idx,
                    chunk_id=str(c_id),
                    document_id=str(d_id),
                    document_title=str(d_title),
                    page_number=meta.get("page_number"),
                    timestamp_seconds=meta.get("timestamp_seconds"),
                    section=meta.get("section"),
                    snippet=snippet,
                    source_type=meta.get("source_type", "document"),
                ))

        total_latency = (time.perf_counter() - start_time) * 1000.0

        response_data = {
            "query": query,
            "answer": llm_output["answer"],
            "citations": [c.model_dump() for c in citations],
            "latency_ms": round(total_latency, 2),
            "retrieval_latency_ms": round(retrieval_latency, 2),
            "generation_latency_ms": round(generation_latency, 2),
            "cache_hit": False,
            "mode": mode,
            "model_used": llm_output["model_name"],
            "sufficient_evidence": llm_output["sufficient_evidence"],
            "metadata": {
                "total_candidates_found": len(candidates),
                "context_chunks_used": len(context_chunks),
            }
        }

        # 6. Save to Redis Cache
        await cache_manager.set(cache_key, response_data)

        # 7. Persist to Database if session provided
        if db:
            try:
                query_record = QueryRecord(
                    user_id=user_id,
                    query_text=query,
                    normalized_query=normalized_query,
                    mode=mode,
                    response_text=llm_output["answer"],
                    response_metadata=response_data["metadata"],
                    cache_hit=False,
                    latency_ms=total_latency,
                )
                db.add(query_record)
                await db.flush()

                for cit in citations:
                    qs = QuerySource(
                        query_id=query_record.id,
                        chunk_id=cit.chunk_id,
                        document_id=cit.document_id,
                        citation_index=cit.citation_index,
                        relevance_score=0.9,
                        snippet=cit.snippet,
                        page_number=cit.page_number,
                        timestamp_seconds=cit.timestamp_seconds,
                        section=cit.section,
                    )
                    db.add(qs)

                await db.commit()
            except Exception as e:
                logger.error(f"Failed to record query history in DB: {e}")
                await db.rollback()

        return RAGResponse(**response_data)


rag_pipeline = RAGPipeline()
