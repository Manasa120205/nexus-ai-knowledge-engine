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
    
    # In serverless environments (Vercel/AWS Lambda), ensure SQLite writes to /tmp
    if is_sqlite and (os.environ.get("VERCEL") or not os.access(".", os.W_OK)):
        tmp_dir = os.environ.get("TMPDIR", "/tmp")
        tmp_db = os.path.join(tmp_dir, "nexus.db")

        # Search for bundled nexus.db across potential serverless working directories
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
        candidates = [
            os.path.join(root_dir, "nexus.db"),
            "/var/task/nexus.db",
            os.path.join(os.getcwd(), "nexus.db"),
            os.path.join(os.path.dirname(os.getcwd()), "nexus.db"),
            "nexus.db",
            "../nexus.db",
        ]
        source_db = next((c for c in candidates if c and os.path.exists(c) and os.path.getsize(c) > 0), None)

        # Copy if tmp_db doesn't exist or if source_db has pre-seeded records
        if source_db and (not os.path.exists(tmp_db) or os.path.getsize(tmp_db) < 4096):
            try:
                import shutil
                shutil.copyfile(source_db, tmp_db)
                logger.info(f"Loaded bundled database from {source_db} to {tmp_db}")
            except Exception as e:
                logger.warning(f"Could not copy bundled DB: {e}")

        db_url = f"sqlite+aiosqlite:///{tmp_db}"

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

        # Seed default test users if missing
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                from backend.app.models.user import User
                from backend.app.security.auth import hash_password
                res = await session.execute(select(User).where(User.email == "demo@nexus.ai"))
                if not res.scalar_one_or_none():
                    demo_user = User(
                        id="3ccdcc89-d39c-4b6c-b2a9-05669881d0e5",
                        email="demo@nexus.ai",
                        hashed_password=hash_password("DemoPass123!"),
                        full_name="NEXUS Demo User",
                        is_active=True,
                    )
                    session.add(demo_user)
                    await session.commit()
                    logger.info("Default demo user demo@nexus.ai initialized.")

                m_res = await session.execute(select(User).where(User.email == "manasagoud2022@gmail.com"))
                if not m_res.scalar_one_or_none():
                    manasa_user = User(
                        id="85b9c65a-452e-4c04-becf-b214511210c6",
                        email="manasagoud2022@gmail.com",
                        hashed_password=hash_password("SecurePass123!"),
                        full_name="Pandala Manasa",
                        is_active=True,
                    )
                    session.add(manasa_user)
                    await session.commit()
                    logger.info("Primary user manasagoud2022@gmail.com initialized.")
        except Exception as seed_err:
            logger.warning(f"Default user seed notice: {seed_err}")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}")
