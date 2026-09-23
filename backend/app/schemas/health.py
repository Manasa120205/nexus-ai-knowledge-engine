from typing import Dict, Any
from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    cache: str
    embedding_provider: str
    llm_provider: str
    uptime_seconds: float
    details: Dict[str, Any] = {}
