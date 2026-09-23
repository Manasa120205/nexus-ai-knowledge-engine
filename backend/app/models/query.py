import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Float, Boolean, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class QueryRecord(Base):
    __tablename__ = "queries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    query_text = Column(Text, nullable=False)
    normalized_query = Column(Text, nullable=False, index=True)
    mode = Column(String(50), default="hybrid", nullable=False)  # hybrid, vector, keyword, ranked
    response_text = Column(Text, nullable=True)
    response_metadata = Column("response_metadata", JSON, default=dict, nullable=False)
    cache_hit = Column(Boolean, default=False, nullable=False)
    latency_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User", back_populates="queries")
    sources = relationship("QuerySource", back_populates="query", cascade="all, delete-orphan", order_by="QuerySource.citation_index")

    __table_args__ = (
        Index("ix_queries_user_created", "user_id", "created_at"),
    )


class QuerySource(Base):
    __tablename__ = "query_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String(36), ForeignKey("queries.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_id = Column(String(36), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_index = Column(Integer, nullable=False)  # [1], [2], etc.
    relevance_score = Column(Float, default=0.0, nullable=False)
    snippet = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    timestamp_seconds = Column(Float, nullable=True)
    section = Column(String(255), nullable=True)
    source_metadata = Column("metadata", JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    query = relationship("QueryRecord", back_populates="sources")
