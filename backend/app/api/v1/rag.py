from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.rag import RAGRequest, RAGResponse
from backend.app.security.auth import get_optional_user
from backend.app.security.rate_limiter import check_rate_limit
from backend.app.rag.grounded_generator import rag_pipeline
from backend.app.monitoring.metrics_collector import metrics_collector

router = APIRouter(prefix="/rag", tags=["Retrieval-Augmented Generation"])


@router.post("/ask", response_model=RAGResponse, dependencies=[Depends(check_rate_limit)])
async def ask_nexus(
    req: RAGRequest,
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute grounded RAG query pipeline.
    Combines cache check, hybrid retrieval, custom ranking, prompt construction,
    grounded synthesis, and citation verification.
    """
    user_id = current_user.id if current_user else "anonymous_demo_user"

    response = await rag_pipeline.execute(
        query=req.query,
        user_id=user_id,
        db=db,
        mode=req.mode,
        top_k=req.top_k,
        filter_doc_id=req.document_id,
    )

    metrics_collector.record_request(response.latency_ms)
    return response
