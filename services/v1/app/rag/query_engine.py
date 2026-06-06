import time
import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from .vector_store import VectorStore
from .cache import RAGCache
from .schemas import SearchRequest, SearchResponse, RetrievedChunk, ChunkScoreDetail
from v1.app.core.config import get_settings

logger = logging.getLogger("summerease.rag.query_engine")

class QueryEngine:
    """Orchestrates query validation, embedding lookup, vector search, and result re-ranking."""

    def __init__(self, session: AsyncSession, embedding_client):
        self.db = session
        self.embedding_client = embedding_client
        self.vector_store = VectorStore(session)
        self.cache = RAGCache()
        self.settings = get_settings()

    async def search(self, request: SearchRequest, user_id: str) -> SearchResponse:
        """Process semantic query, lookup cache, generate embedding, perform search, re-rank results."""
        start_time = time.monotonic()
        query_id = f"qry_{uuid.uuid4().hex[:12]}"
        
        # 1. Check search cache
        filters = {
            "file_types": request.file_types,
            "document_ids": [str(d_id) for d_id in request.document_ids] if request.document_ids else None,
            "metadata_filters": request.metadata_filters
        }
        
        cached_results = await self.cache.get_search_results(user_id, request.query, filters)
        if cached_results:
            elapsed = (time.monotonic() - start_time) * 1000
            
            matched_chunks = []
            scores = []
            for item in cached_results:
                matched_chunks.append(RetrievedChunk(**item["chunk"]))
                scores.append(ChunkScoreDetail(**item["score"]))
                
            return SearchResponse(
                query=request.query,
                query_id=query_id,
                total_results=len(matched_chunks),
                retrieval_time_ms=elapsed,
                matched_chunks=matched_chunks,
                scores=scores,
                metadata={
                    "embedding_model": self.embedding_client.model,
                    "search_strategy": "vector",
                    "top_k_requested": request.top_k,
                    "similarity_threshold": request.similarity_threshold,
                    "cache_hit": True
                }
            )

        # 2. Get query embedding (with cache-aside)
        query_vector = await self.cache.get_query_embedding(request.query)
        if not query_vector:
            logger.info(f"Query embedding cache miss for '{request.query}'")
            query_vector = await self.embedding_client.embed_single(request.query)
            # Cache the embedding vector for 24 hours
            await self.cache.set_query_embedding(request.query, query_vector)
        else:
            logger.info(f"Query embedding cache hit for '{request.query}'")

        # 3. Retrieve chunks using pgvector (fetch 3x top_k for re-ranking)
        candidates = await self.vector_store.similarity_search(
            query_vector=query_vector,
            owner_id=user_id,
            top_k=request.top_k,
            similarity_threshold=0.0,  # Do not filter in DB, filter in QueryEngine after boosting
            file_types=request.file_types,
            document_ids=request.document_ids,
            embedding_model=self.embedding_client.model,
        )

        # 4. Filter and re-rank candidate chunks
        ranked_chunks = []
        scores_detail = []
        
        for candidate in candidates:
            # Skip if basic vector similarity is below the similarity threshold
            if candidate["score"] < request.similarity_threshold:
                continue
                
            final_score = self._recompute_score(candidate, request.query)
            
            # Record chunk details
            ranked_chunks.append(RetrievedChunk(
                chunk_id=str(candidate["chunk_id"]),
                document_id=str(candidate["document_id"]),
                document_title=candidate["document_title"],
                content=candidate["content"],
                chunk_index=candidate["chunk_index"],
                token_count=candidate["token_count"],
                metadata=candidate["metadata"]
            ))
            
            # Record score breakdowns
            scores_detail.append(ChunkScoreDetail(
                chunk_id=str(candidate["chunk_id"]),
                vector_similarity=candidate["score"],
                keyword_score=self._keyword_overlap_score(candidate["content"], request.query),
                final_score=final_score
            ))

        # Sort combined results based on the final_score descending
        combined = list(zip(ranked_chunks, scores_detail))
        combined.sort(key=lambda x: x[1].final_score, reverse=True)
        combined = combined[:request.top_k]

        if len(combined) < request.top_k:
            existing_chunk_ids = {chunk.chunk_id for chunk, _ in combined}
            keyword_candidates = await self.vector_store.keyword_search(
                query=request.query,
                owner_id=user_id,
                top_k=request.top_k - len(combined),
                file_types=request.file_types,
                document_ids=request.document_ids,
            )

            for candidate in keyword_candidates:
                chunk_id = str(candidate["chunk_id"])
                if chunk_id in existing_chunk_ids:
                    continue

                keyword_score = self._keyword_overlap_score(candidate["content"], request.query)
                chunk = RetrievedChunk(
                    chunk_id=chunk_id,
                    document_id=str(candidate["document_id"]),
                    document_title=candidate["document_title"],
                    content=candidate["content"],
                    chunk_index=candidate["chunk_index"],
                    token_count=candidate["token_count"],
                    metadata=candidate["metadata"]
                )
                score = ChunkScoreDetail(
                    chunk_id=chunk_id,
                    vector_similarity=0.0,
                    keyword_score=keyword_score,
                    final_score=max(keyword_score, 0.01)
                )
                combined.append((chunk, score))
                existing_chunk_ids.add(chunk_id)

        final_matched_chunks = [c[0] for c in combined]
        final_scores = [c[1] for c in combined]

        # 5. Save results to search cache
        cache_data = [
            {
                "chunk": c[0].model_dump(),
                "score": c[1].model_dump()
            }
            for c in combined
        ]
        await self.cache.set_search_results(user_id, request.query, filters, cache_data)

        elapsed = (time.monotonic() - start_time) * 1000
        return SearchResponse(
            query=request.query,
            query_id=query_id,
            total_results=len(final_matched_chunks),
            retrieval_time_ms=elapsed,
            matched_chunks=final_matched_chunks,
            scores=final_scores,
            metadata={
                "embedding_model": self.embedding_client.model,
                "search_strategy": "vector_with_keyword_boosting",
                "top_k_requested": request.top_k,
                "similarity_threshold": request.similarity_threshold,
                "cache_hit": False
            }
        )

    def _recompute_score(self, candidate: Dict[str, Any], query: str) -> float:
        """Applies boosts to baseline cosine similarity to yield final score."""
        score = candidate["score"]
        
        # Boost for headings/sections
        meta = candidate["metadata"] or {}
        if meta.get("is_heading_chunk") or meta.get("heading_hierarchy"):
            score *= 1.05
            
        # Boost for exact keyword overlap
        overlap = self._keyword_overlap_score(candidate["content"], query)
        score += overlap * 0.05
        
        return min(score, 1.0)

    def _keyword_overlap_score(self, content: str, query: str) -> float:
        """Returns normalized keyword overlap between the chunk and the query."""
        import re
        query_words = set(re.findall(r"\w+", query.lower()))
        content_words = set(re.findall(r"\w+", content.lower()))
        if not query_words:
            return 0.0
        overlap = len(query_words & content_words) / len(query_words)
        return overlap
