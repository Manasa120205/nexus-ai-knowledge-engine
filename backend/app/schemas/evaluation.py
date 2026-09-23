from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class EvaluationRunRequest(BaseModel):
    modes: List[str] = Field(default=["vector", "keyword", "hybrid", "ranked"])
    limit_questions: Optional[int] = Field(default=None, ge=1, le=100)


class EvaluationMetricSummary(BaseModel):
    mode: str
    recall_at_k: float
    precision_at_k: float
    mrr: float
    ndcg: float
    groundedness_score: float
    citation_accuracy: float
    retrieval_latency_ms: float
    total_latency_ms: float
    total_questions: int


class EvaluationResponse(BaseModel):
    run_id: str
    created_at: datetime
    summaries: List[EvaluationMetricSummary]
    question_details: Optional[List[Dict[str, Any]]] = None
