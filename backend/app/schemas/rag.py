from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RAGRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    mode: str = Field(default="hybrid", pattern="^(hybrid|vector|keyword|ranked)$")
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: Optional[str] = None


class Citation(BaseModel):
    citation_index: int
    chunk_id: str
    document_id: str
    document_title: str
    page_number: Optional[int] = None
    timestamp_seconds: Optional[float] = None
    section: Optional[str] = None
    snippet: str
    source_type: str


class RAGResponse(BaseModel):
    query: str
    answer: str
    citations: List[Citation]
    latency_ms: float
    retrieval_latency_ms: float
    generation_latency_ms: float
    cache_hit: bool
    mode: str
    model_used: str
    sufficient_evidence: bool
    metadata: Dict[str, Any] = Field(default_factory=dict)
