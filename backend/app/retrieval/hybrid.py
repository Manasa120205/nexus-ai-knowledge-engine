from typing import List, Dict, Any, Optional
from collections import defaultdict
from backend.app.core.config import settings
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.rag.embeddings import embedding_service
from backend.app.retrieval.query_preprocessor import query_preprocessor


class HybridRetriever:
    """
    Combines dense semantic vector retrieval and sparse BM25 keyword retrieval
    using Reciprocal Rank Fusion (RRF).
    """

    def __init__(
        self,
        top_k_vector: int = settings.TOP_K_VECTOR,
        top_k_keyword: int = settings.TOP_K_KEYWORD,
        top_k_final: int = settings.TOP_K_FINAL,
        rrf_k: int = settings.RRF_K,
    ):
        self.top_k_vector = top_k_vector
        self.top_k_keyword = top_k_keyword
        self.top_k_final = top_k_final
        self.rrf_k = rrf_k

    async def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter_doc_id: Optional[str] = None,
        filter_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes parallel vector and keyword retrieval, merging candidates via RRF.
        Enforces tenant isolation when filter_user_id is provided.
        """
        k_final = top_k or self.top_k_final
        normalized_query = query_preprocessor.normalize(query)
        if not normalized_query:
            return []

        # 1. Semantic Vector Search
        query_vector = await embedding_service.embed_query(normalized_query)
        vector_candidates = vector_store.search(
            query_vector=query_vector,
            top_k=self.top_k_vector,
            filter_doc_id=filter_doc_id,
            filter_user_id=filter_user_id,
        )

        # 2. Sparse BM25 Keyword Search
        keyword_candidates = bm25_engine.search(
            query=normalized_query,
            top_k=self.top_k_keyword,
            filter_doc_id=filter_doc_id,
            filter_user_id=filter_user_id,
        )

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF Score = sum( 1 / (k + rank) )
        rrf_scores: Dict[str, float] = defaultdict(float)
        candidate_meta: Dict[str, Dict[str, Any]] = {}
        vector_ranks: Dict[str, int] = {}
        keyword_ranks: Dict[str, int] = {}
        vector_scores: Dict[str, float] = {}
        keyword_scores: Dict[str, float] = {}

        for rank, item in enumerate(vector_candidates, start=1):
            cid = item["chunk_id"]
            rrf_scores[cid] += 1.0 / (self.rrf_k + rank)
            candidate_meta[cid] = item["metadata"]
            vector_ranks[cid] = rank
            vector_scores[cid] = item["score"]

        for rank, item in enumerate(keyword_candidates, start=1):
            cid = item["chunk_id"]
            rrf_scores[cid] += 1.0 / (self.rrf_k + rank)
            if cid not in candidate_meta:
                candidate_meta[cid] = item["metadata"]
            keyword_ranks[cid] = rank
            keyword_scores[cid] = item["score"]

        if not rrf_scores:
            return []

        # Normalize RRF scores to [0.0, 1.0]
        max_rrf = max(rrf_scores.values()) if rrf_scores else 1.0

        sorted_candidates = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:k_final]

        results = []
        for cid, raw_score in sorted_candidates:
            meta = candidate_meta.get(cid, {})
            norm_score = raw_score / max_rrf
            results.append({
                "chunk_id": cid,
                "score": round(norm_score, 4),
                "rrf_score": round(raw_score, 5),
                "semantic_score": vector_scores.get(cid),
                "keyword_score": keyword_scores.get(cid),
                "vector_rank": vector_ranks.get(cid),
                "keyword_rank": keyword_ranks.get(cid),
                "metadata": meta,
            })

        return results


hybrid_retriever = HybridRetriever()
