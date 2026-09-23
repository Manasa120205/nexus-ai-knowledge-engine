from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    source_type: str = Field(pattern="^(pdf|youtube|text|markdown)$")
    source_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    source_type: str
    source_url: Optional[str] = None
    content_hash: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    chunk_count: int = 0
    doc_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    chunk_index: int
    text: str
    page_number: Optional[int] = None
    section: Optional[str] = None
    timestamp_seconds: Optional[float] = None
    source_type: str
    token_count: int
    created_at: datetime


class YouTubeIngestRequest(BaseModel):
    url: str = Field(min_length=5, max_length=1024)
    title: Optional[str] = Field(default=None, max_length=255)


class IngestionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    status: str
    progress_pct: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
