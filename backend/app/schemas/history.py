from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.rag import Citation


class QueryHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query_text: str
    mode: str
    response_text: Optional[str] = None
    cache_hit: bool
    latency_ms: float
    citations_count: int
    created_at: datetime


class QueryHistoryDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query_text: str
    mode: str
    response_text: Optional[str] = None
    cache_hit: bool
    latency_ms: float
    sources: List[Citation]
    response_metadata: Dict[str, Any] = {}
    created_at: datetime
