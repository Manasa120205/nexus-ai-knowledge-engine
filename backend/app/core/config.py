import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "NEXUS — AI Knowledge Retrieval & Research Engine"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="development | production | test")
    DEBUG: bool = False

    # Security
    JWT_SECRET: str = Field(default="nexus-dev-super-secret-key-change-in-production-min-32-chars-long", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:80",
        "http://localhost",
    ]

    # Database: Supports Postgres with asyncpg or fallback to SQLite with aiosqlite
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./nexus.db",
        description="PostgreSQL async URL: postgresql+asyncpg://user:pass@localhost:5432/nexus or SQLite"
    )
    USE_PGVECTOR: bool = False

    # Redis Cache: Supports redis:// or falls back to in-memory cache if unavailable
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CACHE_TTL_SECONDS: int = 3600  # 1 hour
    CACHE_ENABLED: bool = True

    # Embedding Provider: "local" | "gemini" | "openai"
    EMBEDDING_PROVIDER: str = Field(default="local")
    EMBEDDING_API_KEY: Optional[str] = None
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSION: int = 384

    # LLM Provider: "local" | "gemini" | "openai"
    LLM_PROVIDER: str = Field(default="local")
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-1.5-flash"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 1024

    # Uploads & Chunking
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    CHUNK_SIZE_TOKENS: int = 500
    CHUNK_OVERLAP_TOKENS: int = 50

    # Retrieval parameters
    TOP_K_VECTOR: int = 15
    TOP_K_KEYWORD: int = 15
    TOP_K_FINAL: int = 5
    RRF_K: int = 60

    # Ranking weights
    RANKING_WEIGHT_SEMANTIC: float = 0.40
    RANKING_WEIGHT_KEYWORD: float = 0.35
    RANKING_WEIGHT_TITLE: float = 0.15
    RANKING_WEIGHT_METADATA: float = 0.10
    RANKING_FRESHNESS_DECAY: float = 0.05
    RANKING_DUPLICATE_PENALTY: float = 0.15

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60


settings = Settings()
