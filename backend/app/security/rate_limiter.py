import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status, Request
from backend.app.core.config import settings
from backend.app.core.logging import logger


class InMemoryRateLimiter:
    """In-memory sliding window rate limiter fallback when Redis is unavailable."""
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.records: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_key: str) -> bool:
        now = time.time()
        window_start = now - 60.0
        # Evict timestamps older than 60 seconds
        timestamps = [ts for ts in self.records[client_key] if ts > window_start]
        self.records[client_key] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            return False

        self.records[client_key].append(now)
        return True


rate_limiter = InMemoryRateLimiter(requests_per_minute=settings.RATE_LIMIT_REQUESTS_PER_MINUTE)


async def check_rate_limit(request: Request) -> None:
    """Dependency for rate limiting expensive endpoints."""
    if not settings.RATE_LIMIT_ENABLED:
        return

    # Derive client identifier from IP or Auth header
    auth_header = request.headers.get("Authorization")
    client_ip = request.client.host if request.client else "unknown"
    client_key = auth_header if auth_header else client_ip

    allowed = rate_limiter.is_allowed(client_key)
    if not allowed:
        logger.warning(f"Rate limit exceeded for client: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down.",
            headers={"Retry-After": "60"},
        )
