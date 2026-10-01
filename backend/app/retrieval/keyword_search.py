import math
import re
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional


class BM25SearchEngine:
    """
    Production BM25Okapi implementation with technical tokenization and inverted index.
    Optimized for exact code identifiers, error codes, function signatures, and technical terms.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_len: Dict[str, int] = {}
        self.avg_doc_len: float = 0.0
        self.doc_count: int = 0
        self.inverted_index: Dict[str, Dict[str, int]] = defaultdict(dict)  # token -> {chunk_id: term_frequency}
        self.doc_tokens: Dict[str, List[str]] = {}
        self.doc_metadata: Dict[str, Dict[str, Any]] = {}

    def _tokenize(self, text: str) -> List[str]:
        """Preserves technical terms, dotted APIs, snake_case, camelCase, and punctuation."""
        if not text:
            return []
        # Split tokens preserving special technical characters
        raw_tokens = re.findall(r"[a-zA-Z0-9_\-\.\+]+", text.lower())
        return raw_tokens

    def index_chunk(self, chunk_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add or update a document chunk in the inverted index."""
        tokens = self._tokenize(text)
        token_counts = Counter(tokens)
        
        self.doc_tokens[chunk_id] = tokens
        self.doc_len[chunk_id] = len(tokens)
        self.doc_metadata[chunk_id] = metadata or {}

        # Update inverted index
        for token, count in token_counts.items():
            self.inverted_index[token][chunk_id] = count

        self._recompute_stats()

    def remove_chunk(self, chunk_id: str) -> None:
        """Remove a chunk from the index."""
        if chunk_id not in self.doc_len:
            return
        
        tokens = self.doc_tokens.pop(chunk_id, [])
        self.doc_len.pop(chunk_id, None)
        self.doc_metadata.pop(chunk_id, None)

        for token in set(tokens):
            if token in self.inverted_index and chunk_id in self.inverted_index[token]:
                del self.inverted_index[token][chunk_id]
                if not self.inverted_index[token]:
                    del self.inverted_index[token]

        self._recompute_stats()

    def _recompute_stats(self) -> None:
        self.doc_count = len(self.doc_len)
        if self.doc_count > 0:
            self.avg_doc_len = sum(self.doc_len.values()) / self.doc_count
        else:
            self.avg_doc_len = 0.0

    def search(
        self,
        query: str,
        top_k: int = 10,
        filter_doc_id: Optional[str] = None,
        filter_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Calculates BM25Okapi relevance scores for matching document chunks.
        Enforces tenant isolation when filter_user_id is provided.
        """
        query_tokens = self._tokenize(query)
        if not query_tokens or self.doc_count == 0:
            return []

        scores: Dict[str, float] = defaultdict(float)

        for token in query_tokens:
            posting: Dict[str, int] = {}
            if token in self.inverted_index:
                posting = dict(self.inverted_index[token])
            else:
                # Plural/singular fallback
                alt_tokens = [token.rstrip('s'), token + 's', token.rstrip('es')]
                for alt in alt_tokens:
                    if alt in self.inverted_index:
                        for cid, tf in self.inverted_index[alt].items():
                            posting[cid] = posting.get(cid, 0) + tf

                # Substring/compound word fallback (e.g. 'drone' inside 'dronemodel')
                if len(token) >= 3:
                    for inv_t in self.inverted_index:
                        if token in inv_t or inv_t in token:
                            for cid, tf in self.inverted_index[inv_t].items():
                                posting[cid] = posting.get(cid, 0) + tf

            if not posting:
                continue

            df = len(posting)
            # Standard Robertson-Spärck Jones IDF
            idf = math.log(((self.doc_count - df + 0.5) / (df + 0.5)) + 1.0)
            if idf <= 0:
                idf = 1e-4

            FOUNDATIONAL_USER_IDS = {"3ccdcc89-d39c-4b6c-b2a9-05669881d0e5", "system", "anonymous_demo_user", None, ""}
            for chunk_id, tf in posting.items():
                meta = self.doc_metadata.get(chunk_id, {})
                if filter_doc_id and meta.get("document_id") != filter_doc_id:
                    continue
                if filter_user_id:
                    chunk_uid = meta.get("user_id")
                    if chunk_uid != filter_user_id and chunk_uid not in FOUNDATIONAL_USER_IDS:
                        continue

                d_len = self.doc_len.get(chunk_id, 1)
                # BM25 TF normalization
                denom = tf + self.k1 * (1.0 - self.b + self.b * (d_len / (self.avg_doc_len or 1.0)))
                term_score = idf * ((tf * (self.k1 + 1.0)) / denom)

                # Bonus for exact full phrase substring match
                chunk_text_lower = meta.get("text", "").lower()
                if query.lower() in chunk_text_lower:
                    term_score *= 1.5

                scores[chunk_id] += term_score

        # Fallback: if no scores were accumulated from inverted index, check direct text containment
        if not scores:
            clean_query = query.strip().lower()
            FOUNDATIONAL_USER_IDS = {"3ccdcc89-d39c-4b6c-b2a9-05669881d0e5", "system", "anonymous_demo_user", None, ""}
            for chunk_id, meta in self.doc_metadata.items():
                if filter_doc_id and meta.get("document_id") != filter_doc_id:
                    continue
                if filter_user_id:
                    chunk_uid = meta.get("user_id")
                    if chunk_uid != filter_user_id and chunk_uid not in FOUNDATIONAL_USER_IDS:
                        continue

                chunk_text = meta.get("text", "").lower()
                chunk_title = meta.get("document_title", "").lower()

                # Check if raw query or any query token exists anywhere in text or title
                if clean_query and (clean_query in chunk_text or clean_query in chunk_title):
                    scores[chunk_id] += 3.0

                matches = sum(1 for t in query_tokens if len(t) >= 2 and (t in chunk_text or t in chunk_title))
                if matches > 0:
                    scores[chunk_id] += float(matches) * 1.5

        if not scores:
            return []

        # Normalize BM25 scores to [0.0, 1.0] for fair fusion
        max_score = max(scores.values()) if scores else 1.0
        normalized = {cid: sc / max_score for cid, sc in scores.items()}

        sorted_results = sorted(normalized.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
            {
                "chunk_id": cid,
                "score": round(score, 4),
                "raw_bm25_score": round(scores[cid], 4),
                "metadata": self.doc_metadata.get(cid, {}),
            }
            for cid, score in sorted_results
        ]


# Global singleton instance for in-memory keyword retrieval
bm25_engine = BM25SearchEngine()
