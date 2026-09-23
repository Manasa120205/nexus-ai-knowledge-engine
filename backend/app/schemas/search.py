from typing import Optional, List
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    mode: str = Field(default="hybrid", pattern="^(hybrid|vector|keyword|ranked)$")
    top_k: int = Field(default=5, ge=1, le=50)
    document_id: Optional[str] = None


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    text: str
    snippet: str
    score: float
    semantic_score: Optional[float] = None
    keyword_score: Optional[float] = None
    title_score: Optional[float] = None
    freshness_score: Optional[float] = None
    page_number: Optional[int] = None
    timestamp_seconds: Optional[float] = None
    section: Optional[str] = None
    source_type: str


class SearchResponse(BaseModel):
    query: str
    mode: str
    total_results: int
    latency_ms: float
    results: List[SearchResultItem]


class AutocompleteSuggestion(BaseModel):
    word: str
    frequency: int
    score: float


class AutocompleteResponse(BaseModel):
    prefix: str
    suggestions: List[AutocompleteSuggestion]
    latency_ms: float
