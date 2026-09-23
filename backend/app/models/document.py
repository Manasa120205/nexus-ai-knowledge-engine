import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Float, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # pdf, youtube, text, markdown
    source_url = Column(String(1024), nullable=True)
    content_hash = Column(String(64), nullable=False, index=True)  # SHA-256 for duplicate detection
    file_size = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="queued", nullable=False, index=True)  # queued, processing, completed, failed
    error_message = Column(Text, nullable=True)
    doc_metadata = Column("metadata", JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan", order_by="DocumentChunk.chunk_index")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    ingestion_jobs = relationship("IngestionJob", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_documents_user_status", "user_id", "status"),
        Index("ix_documents_user_created", "user_id", "created_at"),
        Index("ix_documents_user_hash", "user_id", "content_hash"),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    section = Column(String(255), nullable=True)
    timestamp_seconds = Column(Float, nullable=True)  # for YouTube video offset
    source_type = Column(String(50), nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    embedding = Column(JSON, nullable=True)  # Stores float array, compatible across SQLite & PostgreSQL
    chunk_metadata = Column("metadata", JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("ix_chunks_doc_index", "document_id", "chunk_index"),
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    content_hash = Column(String(64), nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    change_summary = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="versions")


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="queued", nullable=False, index=True)  # queued, processing, completed, failed
    progress_pct = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="ingestion_jobs")
    user = relationship("User", back_populates="ingestion_jobs")
