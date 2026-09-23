import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.app.core.config import settings
from backend.app.core.logging import logger

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    is_sqlite = db_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    
    try:
        engine = create_async_engine(
            db_url,
            echo=settings.DEBUG,
            connect_args=connect_args,
            pool_pre_ping=True,
            **({} if is_sqlite else {"pool_size": 10, "max_overflow": 20})
        )
        return engine
    except Exception as e:
        logger.warning(f"Failed to create async engine for {db_url}: {e}. Falling back to local SQLite.")
        fallback_url = "sqlite+aiosqlite:///./nexus_fallback.db"
        return create_async_engine(fallback_url, connect_args={"check_same_thread": False})

engine = get_engine()
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize database tables safely."""
    try:
        async with engine.begin() as conn:
            # Import models so Base has metadata populated
            from backend.app.models import user, document, query, evaluation  # noqa
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}")
