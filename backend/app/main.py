import os
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.cache.redis_cache import cache_manager
from backend.app.api.v1.api_router import api_router
from backend.app.models.document import DocumentChunk
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.trie import autocomplete_trie


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown orchestration."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    
    # 1. Initialize database schema
    await init_db()

    # 2. Initialize Redis or resilient in-memory cache
    await cache_manager.initialize()

    # 3. Warm-up search indices and Trie from previously stored chunks
    try:
        from backend.app.retrieval import warmup_indices
        async with AsyncSessionLocal() as session:
            await warmup_indices(session)
    except Exception as e:
        logger.warning(f"Could not warm up search indices on startup: {e}")

    yield

    logger.info("Shutting down NEXUS engine.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-oriented technical knowledge retrieval platform combining "
        "hybrid search (RRF), BM25, custom ranking, Trie autocomplete, and grounded RAG."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Enriches requests with unique request-id and logs structured latency."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"

    # Log non-health checks
    if not request.url.path.endswith("/health"):
        logger.info(
            f"{request.method} {request.url.path} [{response.status_code}] - {elapsed_ms:.2f}ms",
            extra={
                "request_id": request_id,
                "endpoint": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": round(elapsed_ms, 2),
            },
        )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Protects against leaking raw stack traces to end-users."""
    logger.error(f"Unhandled system exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred while processing your request. Please try again later.",
        },
    )


# Mount API routers
app.include_router(api_router, prefix=settings.API_V1_STR)

# Locate and serve built frontend static assets if available (Production & Serverless mode)
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if not os.path.exists(dist_dir):
    dist_dir = os.path.abspath("frontend/dist")

if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        from fastapi.staticfiles import StaticFiles
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

from fastapi.responses import FileResponse


@app.get("/", tags=["Root"])
async def root(request: Request):
    accept = request.headers.get("accept", "")
    index_file = os.path.join(dist_dir, "index.html") if os.path.exists(dist_dir) else ""
    if "text/html" in accept and index_file and os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Root"])
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "service": settings.PROJECT_NAME,
    }


if os.path.exists(dist_dir):
    @app.get("/{full_path:path}", tags=["Frontend"])
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api/") or full_path in ("health", "docs", "redoc", "openapi.json"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        file_target = os.path.join(dist_dir, full_path)
        if full_path and os.path.isfile(file_target):
            return FileResponse(file_target)
        index_target = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_target):
            return FileResponse(index_target)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
