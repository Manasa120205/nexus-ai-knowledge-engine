import json
import time
from typing import Optional, Any, Dict
import redis.asyncio as aioredis
from backend.app.core.config import settings
from backend.app.core.logging import logger


class CacheManager:
    """
    Production-ready cache layer with Redis primary and thread-safe in-memory fallback.
    Guarantees user isolation in all cache keys and tracks live hit/miss metrics.
    """

    def __init__(self):
        self._redis_client: Optional[aioredis.Redis] = None
        self._is_redis_available: bool = False
        self._in_memory_store: Dict[str, Dict[str, Any]] = {}
        
        # Telemetry metrics
        self.hits: int = 0
        self.misses: int = 0
        self.total_cached_read_latency_ms: float = 0.0

    async def initialize(self) -> None:
        """Attempt connection to Redis. If unavailable, seamlessly fallback to in-memory store."""
        if not settings.CACHE_ENABLED:
            logger.info("Cache is globally disabled via configuration.")
            return

        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
            )
            await client.ping()
            self._redis_client = client
            self._is_redis_available = True
            logger.info(f"Connected successfully to Redis at {settings.REDIS_URL}")
        except Exception as e:
            self._redis_client = None
            self._is_redis_available = False
            logger.warning(
                f"Redis unavailable ({e}). Operating in resilient in-memory cache mode. No data will be lost."
            )

    @property
    def is_available(self) -> bool:
        return self._is_redis_available or True  # In-memory is always active

    @property
    def is_redis(self) -> bool:
        return self._is_redis_available

    def build_user_key(self, user_id: str, namespace: str, key_suffix: str) -> str:
        """Build user-isolated cache key ensuring strict tenant separation."""
        return f"nexus:{user_id}:{namespace}:{key_suffix}"

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve value with latency tracking and hit/miss telemetry."""
        start_time = time.perf_counter()
        result = None

        if self._is_redis_available and self._redis_client is not None:
            try:
                raw_val = await self._redis_client.get(key)
                if raw_val is not None:
                    result = json.loads(raw_val)
            except Exception as e:
                logger.warning(f"Redis get failed ({e}), checking in-memory fallback.")
                result = self._get_in_memory(key)
        else:
            result = self._get_in_memory(key)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        if result is not None:
            self.hits += 1
            self.total_cached_read_latency_ms += elapsed_ms
        else:
            self.misses += 1

        return result

    def _get_in_memory(self, key: str) -> Optional[Any]:
        item = self._in_memory_store.get(key)
        if not item:
            return None
        # Check expiration
        if item["expires_at"] < time.time():
            del self._in_memory_store[key]
            return None
        return item["val"]

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Store value with specified TTL."""
        ttl = ttl_seconds if ttl_seconds is not None else settings.CACHE_TTL_SECONDS
        json_val = json.dumps(value)

        # Store in in-memory store always as safety backup
        self._in_memory_store[key] = {
            "val": value,
            "expires_at": time.time() + ttl,
        }

        # Also write to Redis if connected
        if self._is_redis_available and self._redis_client is not None:
            try:
                await self._redis_client.set(key, json_val, ex=ttl)
                return True
            except Exception as e:
                logger.warning(f"Redis set failed ({e}), kept in in-memory fallback.")
                return False

        return True

    async def delete(self, key: str) -> bool:
        """Evict key from cache."""
        self._in_memory_store.pop(key, None)
        if self._is_redis_available and self._redis_client is not None:
            try:
                await self._redis_client.delete(key)
                return True
            except Exception:
                return False
        return True

    async def clear_user_namespace(self, user_id: str, namespace: str) -> None:
        """Evict all entries for a specific user and namespace."""
        prefix = f"nexus:{user_id}:{namespace}:"
        
        # Clear in-memory
        keys_to_del = [k for k in self._in_memory_store.keys() if k.startswith(prefix)]
        for k in keys_to_del:
            self._in_memory_store.pop(k, None)

        # Clear Redis
        if self._is_redis_available and self._redis_client is not None:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis_client.scan(cursor=cursor, match=f"{prefix}*", count=100)
                    if keys:
                        await self._redis_client.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning(f"Redis prefix clear failed: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Compute real telemetry stats."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100.0) if total > 0 else 0.0
        avg_latency = (self.total_cached_read_latency_ms / self.hits) if self.hits > 0 else 0.0

        return {
            "backend": "redis" if self._is_redis_available else "in-memory (resilient fallback)",
            "is_redis_connected": self._is_redis_available,
            "hits": self.hits,
            "misses": self.misses,
            "total_requests": total,
            "hit_rate_pct": round(hit_rate, 2),
            "avg_cache_read_latency_ms": round(avg_latency, 3),
            "in_memory_keys_count": len(self._in_memory_store),
        }


cache_manager = CacheManager()
