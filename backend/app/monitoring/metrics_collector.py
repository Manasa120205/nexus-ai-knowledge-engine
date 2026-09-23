import time
from typing import Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.cache.redis_cache import cache_manager
from backend.app.models.document import Document, DocumentChunk, IngestionJob
from backend.app.models.query import QueryRecord


class MetricsCollector:
    """Collects real system health, latency, query, and cache telemetry."""

    def __init__(self):
        self.start_time = time.time()
        self.total_requests = 0
        self.total_latency_ms = 0.0

    def record_request(self, latency_ms: float) -> None:
        self.total_requests += 1
        self.total_latency_ms += latency_ms

    async def get_system_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Aggregate telemetry directly from database and cache."""
        # 1. Total documents
        doc_count_res = await db.execute(select(func.count(Document.id)))
        total_docs = doc_count_res.scalar() or 0

        # 2. Total chunks
        chunk_count_res = await db.execute(select(func.count(DocumentChunk.id)))
        total_chunks = chunk_count_res.scalar() or 0

        # 3. Total queries recorded
        query_count_res = await db.execute(select(func.count(QueryRecord.id)))
        total_queries = query_count_res.scalar() or 0

        # 4. Active Ingestion Jobs
        active_jobs_res = await db.execute(
            select(func.count(IngestionJob.id)).where(IngestionJob.status.in_(["queued", "processing"]))
        )
        active_jobs = active_jobs_res.scalar() or 0

        # 5. Average Latency from DB query records
        avg_lat_res = await db.execute(select(func.avg(QueryRecord.latency_ms)))
        avg_db_lat = avg_lat_res.scalar()
        avg_latency = float(avg_db_lat) if avg_db_lat is not None else (
            (self.total_latency_ms / self.total_requests) if self.total_requests > 0 else 0.0
        )

        # 6. Cache stats
        cache_stats = cache_manager.get_stats()

        return {
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "total_queries": total_queries,
            "cache_hits": cache_stats["hits"],
            "cache_misses": cache_stats["misses"],
            "cache_hit_rate": cache_stats["hit_rate_pct"],
            "avg_latency_ms": round(avg_latency, 2),
            "active_jobs": active_jobs,
            "providers": {
                "embedding": settings.EMBEDDING_PROVIDER,
                "llm": settings.LLM_PROVIDER,
                "cache": cache_stats["backend"],
                "database": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            },
        }

    def get_uptime_seconds(self) -> float:
        return round(time.time() - self.start_time, 2)


metrics_collector = MetricsCollector()
