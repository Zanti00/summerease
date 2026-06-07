import logging
import uuid
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from v1.app.core.config import get_settings
from v1.app.documents.models import Document
from v1.app.documents.service import supabase
from .models import DocumentChunk, Embedding
from .cache import RAGCache

from .extraction.pdf_extractor import PDFExtractor
from .extraction.docx_extractor import DOCXExtractor
from .extraction.text_extractor import TextExtractor
from .extraction.normalizer import normalize_text
from .chunking.recursive_chunker import RecursiveChunker
from .embedding.client import EmbeddingClient
from .embedding.rate_limiter import EmbeddingRateLimiter

import structlog
logger = structlog.get_logger("summerease.rag.service")

class RAGService:
    """Manages the RAG document lifecycle, matching the router interface requirements."""

    def __init__(self, session: AsyncSession, settings=None):
        self.db = session
        self.settings = settings or get_settings()
        self.cache = RAGCache()

    def validate_file(self, file_name: str, file_size: int, content_type: Optional[str]) -> None:
        """Validates the file format and size limits."""
        allowed_exts = (".pdf", ".docx", ".txt", ".md")
        filename_lower = file_name.lower()
        if not any(filename_lower.endswith(ext) for ext in allowed_exts):
            raise ValueError(f"Unsupported file format. Allowed: {', '.join(allowed_exts)}")

        max_size_bytes = self.settings.RAG_MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_size_bytes:
            raise ValueError(f"File size exceeds maximum of {self.settings.RAG_MAX_UPLOAD_SIZE_MB}MB")

    def compute_file_hash(self, file_bytes: bytes) -> str:
        """Computes the SHA-256 hash of a file."""
        return hashlib.sha256(file_bytes).hexdigest()

    async def check_duplicate(self, owner_id: str, file_hash: str) -> Optional[str]:
        """Checks if a document with the same hash already exists for this owner.
        Returns the existing document ID or None.
        """
        stmt = select(Document.id).where(
            Document.owner_id == uuid.UUID(owner_id),
            Document.file_hash == file_hash,
            Document.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        return str(row) if row else None

    async def create_document_record(
        self,
        owner_id: str,
        file_name: str,
        file_type: Optional[str],
        file_size: int,
        file_hash: str,
        storage_path: str
    ) -> Document:
        """Creates a pending document record in the database."""
        doc = Document(
            id=uuid.uuid4(),
            owner_id=uuid.UUID(owner_id),
            title=file_name,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            file_hash=file_hash,
            storage_path=storage_path,
            upload_status="uploaded",
            processing_status="pending",
            total_chunks=0,
            total_tokens=0
        )
        self.db.add(doc)
        return doc

    async def list_documents(self, owner_id: str) -> List[Dict[str, Any]]:
        """List all documents for the user formatted for ListResponse."""
        stmt = (
            select(Document)
            .where(Document.owner_id == uuid.UUID(owner_id), Document.deleted_at.is_(None))
            .order_by(Document.created_at.desc())
        )
        result = await self.db.execute(stmt)
        docs = result.scalars().all()
        
        # Parse into dictionary objects
        return [
            {
                "id": str(doc.id),
                "file_name": doc.file_name or doc.title,
                "file_type": doc.file_type,
                "file_size": doc.file_size or 0,
                "upload_status": doc.upload_status or "uploaded",
                "processing_status": doc.processing_status or "pending",
                "total_chunks": doc.total_chunks or 0,
                "total_tokens": doc.total_tokens or 0,
                "created_at": doc.created_at,
                "processing_completed_at": doc.processing_completed_at
            }
            for doc in docs
        ]

    async def get_document_status(self, document_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Returns details on document processing state and progress metrics."""
        stmt = select(Document).where(
            Document.id == uuid.UUID(document_id),
            Document.owner_id == uuid.UUID(owner_id),
            Document.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            return None

        total_chunks = doc.total_chunks or 0
        chunks_embedded = 0
        percentage = 0

        p_status = doc.processing_status or "pending"

        if p_status == "completed":
            percentage = 100
            chunks_embedded = total_chunks
        elif p_status == "extracting":
            percentage = 20
        elif p_status == "chunking":
            percentage = 40
        elif p_status == "embedding":
            # Count chunks that already have an embedding vector
            count_stmt = (
                select(func.count(Embedding.id))
                .join(DocumentChunk, Embedding.chunk_id == DocumentChunk.id)
                .where(DocumentChunk.document_id == doc.id)
            )
            count_res = await self.db.execute(count_stmt)
            chunks_embedded = count_res.scalar() or 0
            if total_chunks > 0:
                percentage = int(40 + (chunks_embedded / total_chunks) * 55)
            else:
                percentage = 60

        return {
            "document_id": str(doc.id),
            "file_name": doc.file_name or doc.title,
            "file_type": doc.file_type,
            "file_size": doc.file_size or 0,
            "upload_status": doc.upload_status or "uploaded",
            "processing_status": p_status,
            "progress": {
                "chunks_total": total_chunks,
                "chunks_embedded": chunks_embedded,
                "percentage": percentage
            },
            "processing_started_at": doc.processing_started_at,
            "processing_completed_at": doc.processing_completed_at,
            "processing_error": doc.processing_error
        }

    async def delete_document(self, document_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Deletes a document from the database and storage."""
        stmt = select(Document).where(
            Document.id == uuid.UUID(document_id),
            Document.owner_id == uuid.UUID(owner_id)
        )
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            return None

        # 1. Count items before deleting for audit response
        chunks_stmt = select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
        chunks_res = await self.db.execute(chunks_stmt)
        chunks_count = chunks_res.scalar() or 0

        embs_stmt = (
            select(func.count(Embedding.id))
            .join(DocumentChunk, Embedding.chunk_id == DocumentChunk.id)
            .where(DocumentChunk.document_id == doc.id)
        )
        embs_res = await self.db.execute(embs_stmt)
        embeddings_count = embs_res.scalar() or 0

        # 2. Delete file from Supabase storage
        storage_deleted = False
        if supabase and doc.storage_path:
            try:
                supabase.storage.from_("documents").remove([doc.storage_path])
                storage_deleted = True
            except Exception as e:
                logger.warning(f"Failed to delete file from storage: {e}")

        # 3. Cascade delete from DB
        await self.db.delete(doc)
        await self.db.commit()

        # 4. Invalidate caches
        await self.cache.invalidate_document_cache(document_id, owner_id)

        return {
            "status": "deleted",
            "document_id": document_id,
            "chunks_deleted": chunks_count,
            "embeddings_deleted": embeddings_count,
            "storage_deleted": storage_deleted
        }

    async def list_chunks(
        self,
        document_id: str,
        owner_id: str,
        page: int = 1,
        per_page: int = 20
    ) -> Optional[Dict[str, Any]]:
        """Returns paginated chunks for a given document."""
        stmt = select(Document).where(
            Document.id == uuid.UUID(document_id),
            Document.owner_id == uuid.UUID(owner_id),
            Document.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            return None

        # Get total chunks
        count_stmt = select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        # Fetch paginated chunks
        offset = (page - 1) * per_page
        chunks_stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .offset(offset)
            .limit(per_page)
        )
        chunks_result = await self.db.execute(chunks_stmt)
        chunks = chunks_result.scalars().all()

        # Check embeddings
        chunk_ids = [c.id for c in chunks]
        embedded_ids = set()
        if chunk_ids:
            emb_stmt = select(Embedding.chunk_id).where(Embedding.chunk_id.in_(chunk_ids))
            emb_res = await self.db.execute(emb_stmt)
            embedded_ids = set(emb_res.scalars().all())

        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        return {
            "document_id": document_id,
            "chunks": [
                {
                    "chunk_id": str(c.id),
                    "chunk_index": c.chunk_index,
                    "content": c.chunk_content,
                    "token_count": c.token_count,
                    "metadata": c.chunk_metadata or {},
                    "has_embedding": c.id in embedded_ids
                }
                for c in chunks
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages
            }
        }

    async def run_ingestion_pipeline(self, db: AsyncSession, doc_id: str) -> None:
        """Run the backend processing pipeline for RAG. Called by background worker."""
        stmt = select(Document).where(Document.id == uuid.UUID(doc_id))
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        
        if not doc:
            logger.error(f"Ingestion failed: Document {doc_id} not found.")
            return

        if doc.processing_status == "completed":
            return

        doc.processing_started_at = datetime.utcnow()
        await db.commit()

        try:
            # 1. Extraction
            doc.processing_status = "extracting"
            await db.commit()

            if not supabase:
                raise RuntimeError("Supabase storage is not configured.")
            
            logger.info("rag.ingestion.download_started", storage_path=doc.storage_path)
            file_bytes = supabase.storage.from_("documents").download(doc.storage_path)

            title_lower = doc.title.lower()
            if title_lower.endswith(".pdf"):
                extractor = PDFExtractor()
            elif title_lower.endswith(".docx"):
                extractor = DOCXExtractor()
            elif title_lower.endswith((".txt", ".md")):
                extractor = TextExtractor()
            else:
                raise ValueError(f"Unsupported format: {doc.title}")

            extracted = extractor.extract(file_bytes)
            normalized = normalize_text(extracted.full_text)

            if len(normalized) < 50:
                raise ValueError("Document extracted text too short (under 50 characters).")

            # 2. Chunking
            doc.processing_status = "chunking"
            await db.commit()

            chunker = RecursiveChunker(
                max_tokens=self.settings.RAG_CHUNK_SIZE,
                overlap_tokens=self.settings.RAG_CHUNK_OVERLAP
            )
            
            doc_metadata = {
                "document_id": str(doc.id),
                "document_title": doc.title,
                "file_type": doc.file_type
            }
            chunks = chunker.chunk(normalized, doc_metadata)

            doc.total_chunks = len(chunks)
            doc.total_tokens = sum(c.token_count for c in chunks)

            # Idempotent: delete existing chunks
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.id))

            db_chunks = []
            for c in chunks:
                db_chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=c.index,
                    chunk_content=c.content,
                    chunk_hash=c.hash,
                    token_count=c.token_count,
                    char_count=c.char_count,
                    chunk_metadata=c.metadata
                )
                db.add(db_chunk)
                db_chunks.append(db_chunk)
            
            await db.commit()

            # 3. Embedding
            doc.processing_status = "embedding"
            await db.commit()

            for c in db_chunks:
                await db.refresh(c)

            # Initialize client
            rate_limiter = EmbeddingRateLimiter(
                requests_per_minute=self.settings.EMBEDDING_RPM_LIMIT,
                requests_per_day=self.settings.EMBEDDING_RPD_LIMIT
            )
            emb_client = EmbeddingClient(
                api_key=self.settings.GOOGLE_API_KEY,
                model=self.settings.EMBEDDING_MODEL,
                rate_limiter=rate_limiter,
                dimensions=self.settings.EMBEDDING_DIMENSIONS
            )

            batch_size = self.settings.EMBEDDING_BATCH_SIZE
            for i in range(0, len(db_chunks), batch_size):
                batch = db_chunks[i:i + batch_size]
                batch_contents = [chunk.chunk_content for chunk in batch]
                
                logger.info(f"Generating embeddings: batch {i//batch_size + 1}")
                vectors = await emb_client.embed_batch(batch_contents)

                for chunk, vector in zip(batch, vectors):
                    db_emb = Embedding(
                        chunk_id=chunk.id,
                        embedding_vector=vector,
                        embedding_model=emb_client.model,
                        model_version="v1"
                    )
                    db.add(db_emb)
                await db.commit()

            # 4. Completed
            doc.processing_status = "completed"
            doc.processing_completed_at = datetime.utcnow()
            doc.processing_error = None
            await db.commit()
            
            await self.cache.invalidate_owner_search_cache(str(doc.owner_id))
            logger.info("rag.ingestion.success", document_id=str(doc.id))

        except Exception as e:
            logger.error("rag.ingestion.failed", document_id=str(doc.id), error=str(e))
            doc.processing_status = "failed"
            doc.processing_error = str(e)
            doc.processing_completed_at = datetime.utcnow()
            await db.commit()
            raise e

    async def embed_and_chunk_inline_text(self, db: AsyncSession, doc_id: str, text: str) -> None:
        """Chunks and embeds a piece of inline text (like OCR from an uploaded image), appending to the document."""
        stmt = select(Document).where(Document.id == uuid.UUID(doc_id))
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        
        if not doc:
            logger.error(f"Inline embedding failed: Document {doc_id} not found.")
            return

        normalized = normalize_text(text)
        if len(normalized) < 10:
            return # Too short

        chunker = RecursiveChunker(
            max_tokens=self.settings.RAG_CHUNK_SIZE,
            overlap_tokens=self.settings.RAG_CHUNK_OVERLAP
        )
        
        doc_metadata = {
            "document_id": str(doc.id),
            "document_title": doc.title,
            "file_type": doc.file_type
        }
        chunks = chunker.chunk(normalized, doc_metadata)
        if not chunks:
            return

        # Fetch current max chunk_index
        max_idx_stmt = select(func.max(DocumentChunk.chunk_index)).where(DocumentChunk.document_id == doc.id)
        max_idx_res = await db.execute(max_idx_stmt)
        current_max_idx = max_idx_res.scalar()
        next_idx = (current_max_idx + 1) if current_max_idx is not None else 0

        db_chunks = []
        for c in chunks:
            db_chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=next_idx,
                chunk_content=c.content,
                chunk_hash=c.hash,
                token_count=c.token_count,
                char_count=c.char_count,
                chunk_metadata=c.metadata
            )
            db.add(db_chunk)
            db_chunks.append(db_chunk)
            next_idx += 1
            
        await db.commit()

        # Update totals
        doc.total_chunks = (doc.total_chunks or 0) + len(chunks)
        doc.total_tokens = (doc.total_tokens or 0) + sum(c.token_count for c in chunks)
        await db.commit()

        for c in db_chunks:
            await db.refresh(c)

        # Initialize client
        rate_limiter = EmbeddingRateLimiter(
            requests_per_minute=self.settings.EMBEDDING_RPM_LIMIT,
            requests_per_day=self.settings.EMBEDDING_RPD_LIMIT
        )
        emb_client = EmbeddingClient(
            api_key=self.settings.GOOGLE_API_KEY,
            model=self.settings.EMBEDDING_MODEL,
            rate_limiter=rate_limiter,
            dimensions=self.settings.EMBEDDING_DIMENSIONS
        )

        batch_contents = [chunk.chunk_content for chunk in db_chunks]
        vectors = await emb_client.embed_batch(batch_contents)

        for chunk, vector in zip(db_chunks, vectors):
            db_emb = Embedding(
                chunk_id=chunk.id,
                embedding_vector=vector,
                embedding_model=emb_client.model,
                model_version="v1"
            )
            db.add(db_emb)
        await db.commit()
        
        await self.cache.invalidate_owner_search_cache(str(doc.owner_id))
        logger.info("rag.inline_ingestion.success", document_id=str(doc.id), new_chunks=len(chunks))
