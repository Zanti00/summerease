"""pgvector-backed vector store for similarity search."""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from v1.app.rag.models import DocumentChunk, Embedding

logger = structlog.get_logger()


class VectorStore:
    """
    Handles all pgvector similarity search operations against PostgreSQL.

    All queries enforce owner_id filtering for multi-tenant isolation.
    Uses cosine distance operator (<=> in pgvector) for similarity ranking.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def similarity_search(
        self,
        query_vector: list[float],
        owner_id: str,
        top_k: int = 10,
        similarity_threshold: float = 0.70,
        file_types: list[str] | None = None,
        document_ids: list[str] | None = None,
        embedding_model: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Find the top-k most similar chunks to a query vector.

        Uses pgvector's cosine distance operator with owner_id tenant isolation.
        Over-fetches by 3x for re-ranking downstream.

        Args:
            query_vector: 768-dimensional query embedding.
            owner_id: User ID for tenant isolation (mandatory).
            top_k: Number of results to return after re-ranking.
            similarity_threshold: Minimum cosine similarity score.
            file_types: Optional filter by document MIME types.
            document_ids: Optional filter by specific document IDs.

        Returns:
            List of dicts with chunk_id, document_id, content, score, metadata.
        """
        if embedding_model is None:
            from v1.app.core.config import get_settings
            settings = get_settings()
            embedding_model = settings.EMBEDDING_MODEL
        if not embedding_model.startswith("models/"):
            embedding_model = f"models/{embedding_model}"

        vector_str = f"[{','.join(str(v) for v in query_vector)}]"
        fetch_limit = top_k * 3  # Over-fetch for re-ranking

        # Build parameterized SQL
        sql = text("""
            SELECT
                e.id AS embedding_id,
                dc.id AS chunk_id,
                dc.document_id,
                dc.chunk_content,
                dc.chunk_index,
                dc.token_count,
                dc.metadata,
                d.title AS document_title,
                1 - (e.embedding_vector <=> CAST(:query_vector AS vector)) AS similarity_score
            FROM embeddings e
            JOIN document_chunks dc ON e.chunk_id = dc.id
            JOIN documents d ON dc.document_id = d.id
            WHERE
                d.owner_id = :owner_id
                AND d.deleted_at IS NULL
                AND d.processing_status = 'completed'
                AND e.embedding_model = :embedding_model
                AND e.model_version = 'v1'
                AND (CAST(:file_types AS text) IS NULL OR d.file_type = ANY(:file_types_arr))
                AND (CAST(:document_ids AS text) IS NULL OR dc.document_id = ANY(CAST(:document_ids_arr AS uuid[])))
            ORDER BY e.embedding_vector <=> CAST(:query_vector AS vector)
            LIMIT :fetch_limit
        """)

        params = {
            "query_vector": vector_str,
            "owner_id": owner_id,
            "fetch_limit": fetch_limit,
            "embedding_model": embedding_model,
            "file_types": None if file_types is None else "not_null",
            "file_types_arr": file_types,
            "document_ids": None if document_ids is None else "not_null",
            "document_ids_arr": [str(d) for d in document_ids] if document_ids else None,
        }

        result = await self._session.execute(sql, params)
        rows = result.fetchall()

        results = []
        for row in rows:
            score = float(row.similarity_score)
            if score < similarity_threshold:
                continue
            results.append({
                "chunk_id": str(row.chunk_id),
                "document_id": str(row.document_id),
                "document_title": row.document_title or "Untitled",
                "content": row.chunk_content,
                "chunk_index": row.chunk_index,
                "token_count": row.token_count,
                "metadata": row.metadata or {},
                "similarity_score": score,
                "score": score,
            })

        logger.info(
            "rag.vector_store.search.complete",
            owner_id=owner_id,
            top_k=top_k,
            threshold=similarity_threshold,
            results_before_filter=len(rows),
            results_after_filter=len(results),
        )
        return results

    async def keyword_search(
        self,
        query: str,
        owner_id: str,
        top_k: int = 10,
        file_types: list[str] | None = None,
        document_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Find chunks containing the literal query text as a fallback."""
        escaped_query = (
            query.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"%{escaped_query}%"

        sql = text("""
            SELECT
                dc.id AS chunk_id,
                dc.document_id,
                dc.chunk_content,
                dc.chunk_index,
                dc.token_count,
                dc.metadata,
                d.title AS document_title
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE
                d.owner_id = :owner_id
                AND d.deleted_at IS NULL
                AND d.processing_status = 'completed'
                AND dc.chunk_content ILIKE :pattern ESCAPE '\\'
                AND (CAST(:file_types AS text) IS NULL OR d.file_type = ANY(:file_types_arr))
                AND (CAST(:document_ids AS text) IS NULL OR dc.document_id = ANY(CAST(:document_ids_arr AS uuid[])))
            ORDER BY dc.chunk_index ASC
            LIMIT :top_k
        """)

        params = {
            "owner_id": owner_id,
            "pattern": pattern,
            "top_k": top_k,
            "file_types": None if file_types is None else "not_null",
            "file_types_arr": file_types,
            "document_ids": None if document_ids is None else "not_null",
            "document_ids_arr": [str(d) for d in document_ids] if document_ids else None,
        }

        result = await self._session.execute(sql, params)
        rows = result.fetchall()
        results = [
            {
                "chunk_id": str(row.chunk_id),
                "document_id": str(row.document_id),
                "document_title": row.document_title or "Untitled",
                "content": row.chunk_content,
                "chunk_index": row.chunk_index,
                "token_count": row.token_count,
                "metadata": row.metadata or {},
                "similarity_score": 0.0,
                "score": 0.0,
            }
            for row in rows
        ]

        logger.info(
            "rag.vector_store.keyword_search.complete",
            owner_id=owner_id,
            top_k=top_k,
            results=len(results),
        )
        return results

    async def bulk_insert_embeddings(
        self,
        chunk_ids: list[str],
        vectors: list[list[float]],
        embedding_model: str = "text-embedding-004",
    ) -> int:
        """
        Batch insert embedding vectors for a list of chunk IDs.

        Args:
            chunk_ids: List of document_chunk UUIDs.
            vectors: Corresponding embedding vectors (768d each).

        Returns:
            Number of embeddings inserted.
        """
        if len(chunk_ids) != len(vectors):
            raise ValueError(
                f"Mismatch: {len(chunk_ids)} chunk_ids vs {len(vectors)} vectors"
            )

        if not embedding_model.startswith("models/"):
            embedding_model = f"models/{embedding_model}"

        embeddings = []
        for chunk_id, vector in zip(chunk_ids, vectors):
            vector_str = f"[{','.join(str(v) for v in vector)}]"
            embeddings.append({
                "id": str(uuid.uuid4()),
                "chunk_id": chunk_id,
                "embedding_vector": vector_str,
                "embedding_model": embedding_model,
                "model_version": "v1",
            })

        if embeddings:
            stmt = text("""
                INSERT INTO embeddings (id, chunk_id, embedding_vector, embedding_model, model_version)
                VALUES (:id, :chunk_id, :embedding_vector::vector, :embedding_model, :model_version)
                ON CONFLICT (chunk_id, embedding_model, model_version) DO NOTHING
            """)
            for emb in embeddings:
                await self._session.execute(stmt, emb)
            await self._session.flush()

        logger.info(
            "rag.vector_store.bulk_insert.complete",
            count=len(embeddings),
        )
        return len(embeddings)
