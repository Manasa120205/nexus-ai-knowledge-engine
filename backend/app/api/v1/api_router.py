from fastapi import APIRouter
from backend.app.api.v1 import (
    auth,
    documents,
    search,
    rag,
    history,
    evaluation,
    metrics,
    health,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(search.router)
api_router.include_router(rag.router)
api_router.include_router(history.router)
api_router.include_router(evaluation.router)
api_router.include_router(metrics.router)
