from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.cache.redis_cache import cache_manager
from backend.app.rag.embeddings import embedding_service
from backend.app.rag.llm_provider import llm_service
from backend.app.schemas.health import HealthCheckResponse
from backend.app.monitoring.metrics_collector import metrics_collector

router = APIRouter(tags=["Health & Probes"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Liveness probe: verifies system components and services."""
    # Check database
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy ({type(e).__name__})"

    # Check cache
    cache_status = "healthy (redis)" if cache_manager.is_redis else "degraded (in-memory fallback)"

    overall_status = "ok" if db_status == "healthy" else "degraded"

    return HealthCheckResponse(
        status=overall_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        cache=cache_status,
        embedding_provider=settings.EMBEDDING_PROVIDER,
        llm_provider=settings.LLM_PROVIDER,
        uptime_seconds=metrics_collector.get_uptime_seconds(),
        details={
            "debug": settings.DEBUG,
            "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
        },
    )


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe for container orchestrators."""
    try:
        await db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return {"ready": False, "reason": "Database connection not ready"}
