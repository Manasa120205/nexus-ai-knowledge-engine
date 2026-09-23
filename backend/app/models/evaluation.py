import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Float, Index
from backend.app.core.database import Base


class EvaluationQuestion(Base):
    __tablename__ = "evaluation_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question = Column(Text, nullable=False)
    expected_source = Column(String(255), nullable=False)
    expected_relevant_content = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=False)
    category = Column(String(100), default="general", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(64), nullable=False, index=True)
    mode = Column(String(50), nullable=False)  # vector, keyword, hybrid, ranked
    recall_at_k = Column(Float, nullable=False)
    precision_at_k = Column(Float, nullable=False)
    mrr = Column(Float, nullable=False)
    ndcg = Column(Float, nullable=False)
    groundedness_score = Column(Float, nullable=False)
    citation_accuracy = Column(Float, nullable=False)
    retrieval_latency_ms = Column(Float, nullable=False)
    total_latency_ms = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    details = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    __table_args__ = (
        Index("ix_eval_run_mode", "run_id", "mode"),
    )
