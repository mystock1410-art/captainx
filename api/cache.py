"""Async TTL cache. Uses Upstash Redis if REDIS_URL is set, else in-memory."""
from __future__ import annotations
import asyncio
import json
import os
import time
from typing import Any, Awaitable, Callable, TypeVar

T = TypeVar("T")

_mem: dict[str, tuple[float, Any]] = {}
_locks: dict[str, asyncio.Lock] = {}

_redis: Any | None = None
_redis_ready = False


def _lock(key: str) -> asyncio.Lock:
    lock = _locks.get(key)
    if lock is None:
        lock = _locks[key] = asyncio.Lock()
    return lock


async def _get_redis() -> Any | None:
    """Lazy-init redis.asyncio client from REDIS_URL. Returns None if unavailable."""
    global _redis, _redis_ready
    if _redis_ready:
        return _redis
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        _redis_ready = True
        return None
    try:
        import redis.asyncio as redis  # type: ignore
        client = redis.from_url(url, encoding="utf-8", decode_responses=True)
        # Ping to validate; tolerate transient failures.
        await client.ping()
        _redis = client
    except Exception:
        _redis = None
    _redis_ready = True
    return _redis


async def cached(key: str, ttl: float, loader: Callable[[], Awaitable[T]]) -> T:
    """Return cached value or run `loader()` and cache. Coalesces concurrent misses."""
    redis = await _get_redis()

    if redis is not None:
        try:
            raw = await redis.get(key)
            if raw is not None:
                return json.loads(raw)
        except Exception:
            pass  # fall through to loader
    else:
        now = time.monotonic()
        hit = _mem.get(key)
        if hit and hit[0] > now:
            return hit[1]

    async with _lock(key):
        if redis is not None:
            try:
                raw = await redis.get(key)
                if raw is not None:
                    return json.loads(raw)
            except Exception:
                pass
        else:
            hit = _mem.get(key)
            if hit and hit[0] > time.monotonic():
                return hit[1]

        value = await loader()

        if redis is not None:
            try:
                await redis.set(key, json.dumps(value, default=str), ex=int(ttl))
            except Exception:
                pass
        else:
            _mem[key] = (time.monotonic() + ttl, value)

        return value
