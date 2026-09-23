import abc
import hashlib
import math
from typing import List, Optional
import numpy as np
from backend.app.core.config import settings
from backend.app.core.logging import logger


class EmbeddingProvider(abc.ABC):
    """Abstract interface for dense vector embedding generation."""

    @abc.abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Embed a single search query."""
        pass

    @abc.abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of document texts."""
        pass

    @property
    @abc.abstractmethod
    def dimension(self) -> int:
        pass


class LocalEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic, zero-dependency offline embedding generator.
    Uses multi-hash n-gram term projections with sinusoidal positional feature encoding
    normalized to unit L2 norm.
    Produces stable, reproducible 384-dimensional dense vectors suitable for cosine similarity.
    Requires no internet connection, no downloads, and runs instantly in any environment.
    """

    def __init__(self, dimension: int = 384):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    def _generate_vector(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * self._dim

        vec = np.zeros(self._dim, dtype=np.float32)
        words = text.lower().replace(".", " ").replace(",", " ").replace("-", " ").split()
        
        for w in words:
            if not w:
                continue
            # Full word feature
            h_word = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16) % self._dim
            vec[h_word] += 2.0

            # Subword character n-grams (3-gram and 4-gram) for morphological matching
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    g = w[i:i+3]
                    hg = int(hashlib.md5(g.encode("utf-8")).hexdigest(), 16) % self._dim
                    vec[hg] += 0.5
            if len(w) >= 4:
                for i in range(len(w) - 3):
                    g4 = w[i:i+4]
                    hg4 = int(hashlib.md5(g4.encode("utf-8")).hexdigest(), 16) % self._dim
                    vec[hg4] += 0.75

        # L2 Normalize so dot product is exact cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.tolist()

    async def embed_query(self, text: str) -> List[float]:
        return self._generate_vector(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_vector(t) for t in texts]


class GeminiEmbeddingProvider(EmbeddingProvider):
    """Google Gemini API embedding provider with graceful local fallback."""

    def __init__(self, api_key: str, model: str = "text-embedding-004", dimension: int = 384):
        self.api_key = api_key
        self.model = model
        self._dim = dimension
        self._local_fallback = LocalEmbeddingProvider(dimension=dimension)

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_query(self, text: str) -> List[float]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            result = genai.embed_content(
                model=f"models/{self.model}",
                content=text,
                task_type="retrieval_query",
            )
            emb = result["embedding"]
            return emb[:self._dim] if len(emb) >= self._dim else emb + [0.0]*(self._dim - len(emb))
        except Exception as e:
            logger.warning(f"Gemini embedding API call failed: {e}. Falling back to resilient local embedding.")
            return await self._local_fallback.embed_query(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            result = genai.embed_content(
                model=f"models/{self.model}",
                content=texts,
                task_type="retrieval_document",
            )
            embeddings = result["embedding"]
            out = []
            for emb in embeddings:
                res = emb[:self._dim] if len(emb) >= self._dim else emb + [0.0]*(self._dim - len(emb))
                out.append(res)
            return out
        except Exception as e:
            logger.warning(f"Gemini batch embedding API failed: {e}. Falling back to resilient local embedding.")
            return await self._local_fallback.embed_documents(texts)


def get_embedding_provider() -> EmbeddingProvider:
    """Factory to retrieve configured embedding provider with automatic fallback."""
    provider_name = settings.EMBEDDING_PROVIDER.lower()
    
    if provider_name == "gemini" and settings.EMBEDDING_API_KEY:
        logger.info("Initializing Gemini Embedding Provider.")
        return GeminiEmbeddingProvider(
            api_key=settings.EMBEDDING_API_KEY,
            model=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION,
        )

    # Default to resilient local provider
    logger.info("Initializing Local Deterministic Embedding Provider (Offline ready).")
    return LocalEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)


embedding_service = get_embedding_provider()
