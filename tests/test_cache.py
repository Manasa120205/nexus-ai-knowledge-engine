import asyncio
import pytest
from backend.app.cache.redis_cache import CacheManager


@pytest.mark.asyncio
async def test_cache_hit_and_miss_tracking():
    cache = CacheManager()
    await cache.initialize()

    # Miss
    val_miss = await cache.get("nonexistent_key_xyz")
    assert val_miss is None
    assert cache.misses >= 1

    # Set and Hit
    await cache.set("test_key", {"data": 42}, ttl_seconds=10)
    val_hit = await cache.get("test_key")
    assert val_hit == {"data": 42}
    assert cache.hits >= 1

    # Check stats
    stats = cache.get_stats()
    assert stats["hits"] >= 1
    assert stats["misses"] >= 1
    assert stats["total_requests"] >= 2
    assert stats["hit_rate_pct"] > 0.0


@pytest.mark.asyncio
async def test_cache_ttl_expiration():
    cache = CacheManager()
    await cache.initialize()

    # Set key with 1-second TTL
    await cache.set("short_lived", "ephemeral_value", ttl_seconds=1)
    
    val1 = await cache.get("short_lived")
    assert val1 == "ephemeral_value"

    # Wait for expiration
    await asyncio.sleep(1.1)

    val2 = await cache.get("short_lived")
    assert val2 is None
