from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.schemas.metrics import SystemMetricsResponse
from backend.app.monitoring.metrics_collector import metrics_collector

router = APIRouter(prefix="/metrics", tags=["System Telemetry & Metrics"])


@router.get("/", response_model=SystemMetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve real-time telemetry: document counts, latency, queries, cache hit rate."""
    data = await metrics_collector.get_system_metrics(db)
    return SystemMetricsResponse(**data)
