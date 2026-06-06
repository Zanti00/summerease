"""Redis cache operations for the RAG pipeline."""
from __future__ import annotations

import hashlib
import json
import unicodedata
import re

import structlog

logger = structlog.get_logger()


def normalize_query(query: str) -> str:
    """Normalize query for consistent embedding and caching."""
    query = query.lower().strip()
    query = unicodedata.normalize("NFC", query)
    query = re.sub(r"\s+", " ", query)
    return query


def make_search_cache_key(owner_id: str, query: str, filters: dict) -> str:
    """Generate a deterministic cache key for search results."""
    normalized = normalize_query(query)
    filter_str = json.dumps(filters, sort_keys=True, default=str)
    payload = f"{normalized}|{filter_str}"
    content_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"rag:search:v1:{owner_id}:{content_hash}"


def make_embedding_cache_key(text: str) -> str:
    """Cache key for query embedding vectors."""
    normalized = normalize_query(text)
    content_hash = hashlib.sha256(normalized.encode()).hexdigest()[:16]
    return f"rag:qemb:v1:{content_hash}"


class RAGCache:
    """
    Redis-backed cache for the RAG pipeline.

    Cache targets and TTLs:
        - Query results:     5 min  (invalidated when new document is processed)
        - Query embeddings:  24 hr  (invalidated on model version change)
        - Hot chunks:        1 hr   (invalidated on chunk update/delete)
        - Document status:   30 sec (updated by worker)
        - Processing progress: 10 sec (updated by worker)
    """

    def __init__(self, redis_client=None, settings=None) -> None:
        if redis_client is None:
            import os
            from redis.asyncio import Redis as AsyncRedis
            from v1.app.core.config import get_settings
            s = settings or get_settings()
            url = getattr(s, "REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6380"))
            redis_client = AsyncRedis.from_url(url, decode_responses=True)
            
        self._redis = redis_client
        self._search_ttl = getattr(settings, "RAG_SEARCH_CACHE_TTL", 300) or 300
        self._embedding_ttl = getattr(settings, "RAG_EMBEDDING_CACHE_TTL", 86400) or 86400
        self._chunk_ttl = getattr(settings, "RAG_CHUNK_CACHE_TTL", 3600) or 3600

    async def get_search_results(self, owner_id: str, query: str, filters: dict) -> dict | None:
        """Retrieve cached search results."""
        key = make_search_cache_key(owner_id, query, filters)
        cached = await self._redis.get(key)
        if cached:
            logger.debug("rag.cache.search.hit", key=key)
            return json.loads(cached)
        logger.debug("rag.cache.search.miss", key=key)
        return None

    async def set_search_results(
        self, owner_id: str, query: str, filters: dict, results: dict
    ) -> None:
        """Cache search results."""
        key = make_search_cache_key(owner_id, query, filters)
        await self._redis.setex(key, self._search_ttl, json.dumps(results, default=str))
        logger.debug("rag.cache.search.set", key=key, ttl=self._search_ttl)

    async def get_query_embedding(self, query: str) -> list[float] | None:
        """Retrieve cached query embedding vector."""
        key = make_embedding_cache_key(query)
        cached = await self._redis.get(key)
        if cached:
            logger.debug("rag.cache.embedding.hit", key=key)
            return json.loads(cached)
        return None

    async def set_query_embedding(self, query: str, embedding: list[float]) -> None:
        """Cache a query embedding vector."""
        key = make_embedding_cache_key(query)
        await self._redis.setex(key, self._embedding_ttl, json.dumps(embedding))

    async def invalidate_owner_search_cache(self, owner_id: str) -> None:
        """Invalidate all search caches for an owner (e.g., when a new document is processed)."""
        pattern = f"rag:search:v1:{owner_id}:*"
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = await self._redis.scan(cursor, match=pattern, count=100)
            if keys:
                await self._redis.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        if deleted:
            logger.info("rag.cache.invalidate.owner", owner_id=owner_id, keys_deleted=deleted)

    async def invalidate_document_cache(self, document_id: str, owner_id: str) -> None:
        """Invalidate all caches related to a specific document."""
        await self._redis.delete(f"rag:docstatus:{document_id}")
        await self._redis.delete(f"rag:progress:{document_id}")
        await self.invalidate_owner_search_cache(owner_id)

    async def set_processing_progress(
        self, document_id: str, chunks_total: int, chunks_embedded: int
    ) -> None:
        """Update processing progress in cache (short TTL for polling)."""
        key = f"rag:progress:{document_id}"
        progress = {
            "chunks_total": chunks_total,
            "chunks_embedded": chunks_embedded,
            "percentage": int((chunks_embedded / chunks_total * 100) if chunks_total > 0 else 0),
        }
        await self._redis.setex(key, 10, json.dumps(progress))

    async def get_processing_progress(self, document_id: str) -> dict | None:
        """Retrieve processing progress from cache."""
        key = f"rag:progress:{document_id}"
        cached = await self._redis.get(key)
        return json.loads(cached) if cached else None
