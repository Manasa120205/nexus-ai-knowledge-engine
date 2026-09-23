from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.evaluation import EvaluationResult
from backend.app.schemas.evaluation import EvaluationRunRequest, EvaluationResponse, EvaluationMetricSummary
from backend.app.evaluation.evaluator import benchmark_evaluator

router = APIRouter(prefix="/evaluation", tags=["Evaluation & Benchmarking"])


@router.post("/run", response_model=EvaluationResponse)
async def run_evaluation_benchmark(
    req: EvaluationRunRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Execute real automated evaluation benchmark across retrieval modes
    (Vector, Keyword, Hybrid, Ranked) measuring Recall@K, Precision@K, MRR, nDCG, Groundedness.
    """
    response = await benchmark_evaluator.run_evaluation(
        db=db,
        modes=req.modes,
        limit_questions=req.limit_questions,
    )
    return response


@router.get("/runs", response_model=List[EvaluationMetricSummary])
async def list_latest_evaluation_metrics(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the latest recorded benchmark evaluation metrics."""
    stmt = (
        select(EvaluationResult)
        .order_by(EvaluationResult.created_at.desc())
        .limit(limit)
    )
    records = (await db.execute(stmt)).scalars().all()

    return [
        EvaluationMetricSummary(
            mode=r.mode,
            recall_at_k=r.recall_at_k,
            precision_at_k=r.precision_at_k,
            mrr=r.mrr,
            ndcg=r.ndcg,
            groundedness_score=r.groundedness_score,
            citation_accuracy=r.citation_accuracy,
            retrieval_latency_ms=r.retrieval_latency_ms,
            total_latency_ms=r.total_latency_ms,
            total_questions=r.total_questions,
        )
        for r in records
    ]
