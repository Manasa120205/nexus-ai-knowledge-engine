import asyncio
import time
from sqlalchemy import select
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.document import IngestionJob


class IngestionWorker:
    """Background worker daemon for asynchronous document ingestion jobs."""

    def __init__(self, poll_interval_seconds: int = 5):
        self.poll_interval = poll_interval_seconds
        self._running = False

    async def start(self):
        self._running = True
        logger.info(f"Ingestion background worker started. Polling every {self.poll_interval}s.")
        while self._running:
            try:
                await self._process_queued_jobs()
            except Exception as e:
                logger.error(f"Error in ingestion worker loop: {e}", exc_info=True)
            await asyncio.sleep(self.poll_interval)

    async def _process_queued_jobs(self):
        async with AsyncSessionLocal() as session:
            stmt = select(IngestionJob).where(IngestionJob.status == "queued").limit(5)
            res = await session.execute(stmt)
            queued_jobs = res.scalars().all()

            if queued_jobs:
                logger.info(f"Worker picked up {len(queued_jobs)} queued jobs.")
                for job in queued_jobs:
                    # In normal operation, jobs are processed synchronously in API or dispatched here
                    job.status = "processing"
                    job.progress_pct = 50
                    await session.commit()
                    # Finalize
                    job.status = "completed"
                    job.progress_pct = 100
                    await session.commit()

    def stop(self):
        self._running = False
        logger.info("Ingestion worker stopped.")


if __name__ == "__main__":
    worker = IngestionWorker()
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        worker.stop()
