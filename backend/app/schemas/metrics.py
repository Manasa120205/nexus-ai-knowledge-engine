from typing import Dict, Any
from pydantic import BaseModel


class SystemMetricsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_queries: int
    cache_hits: int
    cache_misses: int
    cache_hit_rate: float
    avg_latency_ms: float
    active_jobs: int
    providers: Dict[str, Any]
