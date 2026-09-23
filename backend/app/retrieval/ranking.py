import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.core.config import settings


class CustomRanker:
    """
    Production custom ranking layer combining:
    - Semantic similarity score
    - BM25 keyword score
    - Title match score
    - Section heading match score
    - Freshness decay
    - Duplicate penalty for near-identical chunks from the same document
    """

    def __init__(
        self,
        semantic_weight: float = settings.RANKING_WEIGHT_SEMANTIC,
        keyword_weight: float = settings.RANKING_WEIGHT_KEYWORD,
        title_weight: float = settings.RANKING_WEIGHT_TITLE,
        metadata_weight: float = settings.RANKING_WEIGHT_METADATA,
        freshness_decay: float = settings.RANKING_FRESHNESS_DECAY,
        duplicate_penalty: float = settings.RANKING_DUPLICATE_PENALTY,
    ):
        self.semantic_weight = semantic_weight
        self.keyword_weight = keyword_weight
        self.title_weight = title_weight
        self.metadata_weight = metadata_weight
        self.freshness_decay = freshness_decay
        self.duplicate_penalty = duplicate_penalty

    def _compute_title_score(self, query: str, title: str) -> float:
        """Computes overlap ratio between query keywords and document title."""
        if not title:
            return 0.0
        q_words = set(query.lower().split())
        t_words = set(title.lower().split())
        if not q_words:
            return 0.0
        overlap = len(q_words.intersection(t_words))
        return min(1.0, overlap / len(q_words))

    def _compute_freshness(self, created_at_ts: Optional[float]) -> float:
        """Exponential decay based on age in days."""
        if not created_at_ts:
            return 1.0
        age_days = (time.time() - created_at_ts) / 86400.0
        # Decay factor: retains >90% within 30 days
        return max(0.2, 1.0 / (1.0 + self.freshness_decay * (age_days / 30.0)))

    def rank_candidates(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Re-scores and sorts candidates using weighted multi-factor ranking formula.
        Deconstructs individual score components for complete explainability.
        """
        if not candidates:
            return []

        ranked_items = []
        seen_sections: Dict[str, int] = {}  # Tracks doc_id + section frequency to apply duplicate penalty

        for item in candidates:
            meta = item.get("metadata", {})
            chunk_id = item["chunk_id"]
            doc_id = meta.get("document_id", "")
            title = meta.get("document_title", "")
            section = meta.get("section", "")
            created_at_ts = meta.get("created_at_ts")

            # 1. Component scores
            sem_score = item.get("semantic_score", item.get("score", 0.0)) or 0.0
            kw_score = item.get("keyword_score", 0.0) or 0.0
            title_score = self._compute_title_score(query, title)
            
            # Check section heading match
            section_score = self._compute_title_score(query, section) if section else 0.0
            meta_score = (title_score + section_score) / 2.0

            fresh_score = self._compute_freshness(created_at_ts)

            # 2. Duplicate penalty for redundant passages from the same section
            sec_key = f"{doc_id}:{section}"
            seen_count = seen_sections.get(sec_key, 0)
            seen_sections[sec_key] = seen_count + 1
            dup_penalty = (self.duplicate_penalty * seen_count) if seen_count > 0 else 0.0

            # 3. Final composite score
            composite_score = (
                self.semantic_weight * sem_score
                + self.keyword_weight * kw_score
                + self.title_weight * title_score
                + self.metadata_weight * meta_score
                + (0.05 * fresh_score)
                - dup_penalty
            )
            # Bound composite score
            bounded_score = max(0.01, min(1.0, composite_score))

            ranked_items.append({
                "chunk_id": chunk_id,
                "score": round(bounded_score, 4),
                "semantic_score": round(sem_score, 4),
                "keyword_score": round(kw_score, 4),
                "title_score": round(title_score, 4),
                "freshness_score": round(fresh_score, 4),
                "duplicate_penalty": round(dup_penalty, 4),
                "metadata": meta,
            })

        # Sort descending by composite score
        ranked_items.sort(key=lambda x: x["score"], reverse=True)
        limit = top_k or len(ranked_items)
        return ranked_items[:limit]


custom_ranker = CustomRanker()
