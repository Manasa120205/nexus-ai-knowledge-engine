import numpy as np
from typing import List, Dict, Any, Optional
from backend.app.core.logging import logger


class VectorStore:
    """
    High-performance vector store with cosine similarity index.
    Supports in-memory matrix operations with NumPy and scales seamlessly with pgvector.
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self._chunk_ids: List[str] = []
        self._id_to_idx: Dict[str, int] = {}
        self._vectors: Optional[np.ndarray] = None  # Shape: (N, D)
        self._metadata: Dict[str, Dict[str, Any]] = {}

    def count(self) -> int:
        return len(self._chunk_ids)

    def add_vector(self, chunk_id: str, vector: List[float], metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add or update a vector in the store."""
        vec_arr = np.array(vector, dtype=np.float32)
        norm = np.linalg.norm(vec_arr)
        if norm > 1e-9:
            vec_arr = vec_arr / norm  # Ensure unit norm for fast dot-product cosine similarity

        if chunk_id in self._id_to_idx:
            idx = self._id_to_idx[chunk_id]
            self._vectors[idx] = vec_arr
            self._metadata[chunk_id] = metadata or {}
            return

        idx = len(self._chunk_ids)
        self._chunk_ids.append(chunk_id)
        self._id_to_idx[chunk_id] = idx
        self._metadata[chunk_id] = metadata or {}

        if self._vectors is None:
            self._vectors = np.expand_dims(vec_arr, axis=0)
        else:
            self._vectors = np.vstack([self._vectors, vec_arr])

    def delete_vector(self, chunk_id: str) -> None:
        """Remove a vector from the store."""
        if chunk_id not in self._id_to_idx:
            return

        idx = self._id_to_idx[chunk_id]
        self._chunk_ids.pop(idx)
        del self._id_to_idx[chunk_id]
        self._metadata.pop(chunk_id, None)

        if self._vectors is not None:
            self._vectors = np.delete(self._vectors, idx, axis=0)
            # Rebuild index lookup
            self._id_to_idx = {cid: i for i, cid in enumerate(self._chunk_ids)}

    def search(
        self,
        query_vector: List[float],
        top_k: int = 10,
        filter_doc_id: Optional[str] = None,
        filter_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes vector similarity search using normalized dot product (cosine similarity).
        Returns list of {chunk_id, score, metadata}.
        Enforces tenant isolation when filter_user_id is provided.
        """
        if self._vectors is None or len(self._chunk_ids) == 0:
            return []

        q_arr = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)
        if q_norm > 1e-9:
            q_arr = q_arr / q_norm

        # Matrix dot product (N,)
        similarities = np.dot(self._vectors, q_arr)

        results = []
        for i, cid in enumerate(self._chunk_ids):
            meta = self._metadata.get(cid, {})
            if filter_doc_id and meta.get("document_id") != filter_doc_id:
                continue
            if filter_user_id and meta.get("user_id") != filter_user_id:
                continue

            score = float(similarities[i])
            # Clamp to [0.0, 1.0]
            normalized_score = max(0.0, min(1.0, (score + 1.0) / 2.0 if score < 0 else score))
            results.append({
                "chunk_id": cid,
                "score": round(normalized_score, 4),
                "raw_cosine": round(score, 4),
                "metadata": meta,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]


vector_store = VectorStore()
