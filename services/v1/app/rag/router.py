"""FastAPI router for RAG endpoints — upload, search, status, list, delete, chunks, generate."""
import json
import os
import uuid

import structlog
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from redis import Redis
from rq import Queue
from sqlalchemy.ext.asyncio import AsyncSession

from v1.app.core.config import get_settings
from v1.app.core.database import get_db
from v1.app.auth.nexusauth_client import get_current_user
from v1.app.rag.schemas import (
    SearchRequest,
    SearchResponse,
    UploadResponse,
    DocumentStatusResponse,
    DocumentListResponse,
    DeleteResponse,
    ChunkListResponse,
    GenerateRequest,
)
from v1.app.rag.service import RAGService
from v1.app.rag.query_engine import QueryEngine
from v1.app.rag.embedding import EmbeddingClient, EmbeddingRateLimiter
from v1.app.rag.cache import RAGCache
from v1.app.rag.llm import OllamaClient, OllamaUnavailableError
from v1.app.rag.llm.generation_service import GenerationService

logger = structlog.get_logger()

router = APIRouter(prefix="/rag", tags=["RAG"])

# Configure RAG processing queue
settings = get_settings()
redis_url = settings.REDIS_URL
redis_conn = Redis.from_url(redis_url)
rag_queue = Queue("rag_processing", connection=redis_conn)



def _get_user_id(current_user: dict) -> str:
    """Extract user ID from the authenticated user payload."""
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID missing in auth payload")
    return str(user_id)


def _get_rag_service(session: AsyncSession) -> RAGService:
    """Create a RAGService instance with settings."""
    settings = get_settings()
    return RAGService(session=session, settings=settings)


def _get_embedding_client() -> EmbeddingClient:
    """Create an EmbeddingClient with rate limiter."""
    settings = get_settings()
    rate_limiter = EmbeddingRateLimiter(
        requests_per_minute=settings.EMBEDDING_RPM_LIMIT,
        requests_per_day=settings.EMBEDDING_RPD_LIMIT,
    )
    return EmbeddingClient(
        api_key=settings.GOOGLE_API_KEY,
        model=settings.EMBEDDING_MODEL,
        rate_limiter=rate_limiter,
    )


# --- Endpoints ---


@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document for RAG processing.

    Validates the file, stores it in Supabase Storage, creates a DB record,
    and enqueues a processing job. Returns 202 Accepted immediately.
    """
    user_id = _get_user_id(current_user)
    svc = _get_rag_service(db)

    # Validate file
    try:
        svc.validate_file(
            file_name=file.filename or "unknown",
            file_size=file.size or 0,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Read file bytes
    file_bytes = await file.read()
    file_hash = svc.compute_file_hash(file_bytes)

    # Check duplicate
    existing_id = await svc.check_duplicate(user_id, file_hash)
    if existing_id:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate document. Existing document ID: {existing_id}",
        )

    # Upload to Supabase Storage
    try:
        from supabase import create_client
        settings = get_settings()
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        storage_path = f"rag/{user_id}/{uuid.uuid4().hex}_{file.filename}"
        supabase.storage.from_("documents").upload(storage_path, file_bytes)
    except Exception as exc:
        logger.error("rag.upload.storage_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # Create document record
    doc = await svc.create_document_record(
        owner_id=user_id,
        file_name=file.filename or "unknown",
        file_type=file.content_type,
        file_size=len(file_bytes),
        file_hash=file_hash,
        storage_path=storage_path,
    )
    await db.commit()

    # Enqueue processing job
    try:
        rag_queue.enqueue(
            "v1.app.rag.worker_tasks.process_document_task",
            str(doc.id),
            storage_path,
            job_timeout="30m",
        )
    except Exception as exc:
        logger.warning("rag.upload.queue_error", error=str(exc), document_id=str(doc.id))
        # Continue — document is saved, processing can be retried

    logger.info("rag.upload.complete", document_id=str(doc.id), file_name=file.filename)

    return UploadResponse(
        document_id=str(doc.id),
        file_name=file.filename or "unknown",
        file_type=file.content_type,
        file_size=len(file_bytes),
        upload_status="uploaded",
        processing_status="pending",
        created_at=doc.created_at,
    )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all RAG documents for the authenticated user."""
    user_id = _get_user_id(current_user)
    svc = _get_rag_service(db)
    docs = await svc.list_documents(user_id)
    return DocumentListResponse(documents=docs, total=len(docs))


@router.get("/documents/{document_id}", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get processing status for a specific document."""
    user_id = _get_user_id(current_user)
    svc = _get_rag_service(db)
    result = await svc.get_document_status(document_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentStatusResponse(**result)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a document and all associated chunks, embeddings, and storage files."""
    user_id = _get_user_id(current_user)
    svc = _get_rag_service(db)
    result = await svc.delete_document(document_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return DeleteResponse(**result)


@router.get("/documents/{document_id}/chunks", response_model=ChunkListResponse)
async def list_chunks(
    document_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List chunks for a specific document with pagination."""
    user_id = _get_user_id(current_user)
    svc = _get_rag_service(db)
    result = await svc.list_chunks(document_id, user_id, page, per_page)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return ChunkListResponse(**result)


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Semantic search across the user's documents.

    Returns ranked chunks with similarity scores. No LLM generation.
    """
    user_id = _get_user_id(current_user)
    embedding_client = _get_embedding_client()
    engine = QueryEngine(session=db, embedding_client=embedding_client)
    return await engine.search(request, user_id)


@router.post("/generate")
async def generate_answer(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    RAG-powered answer generation with token streaming.

    Full chain: Query → Vector Retrieval → Prompt Assembly → Ollama Streaming.
    Returns a Server-Sent Events stream of tokens via text/event-stream.

    The response is streamed — tokens arrive incrementally as the LLM generates.
    Each SSE event contains a JSON payload with a 'token' field.
    The stream ends with a 'data: [DONE]' sentinel.
    """
    user_id = _get_user_id(current_user)
    settings = get_settings()

    # Initialize Ollama client
    ollama = OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT_SECONDS,
    )

    # Health check — fail fast if Ollama is down
    if not await ollama.health_check():
        await ollama.close()
        raise HTTPException(
            status_code=503,
            detail="LLM service (Ollama) is unavailable. Ensure it is running.",
        )

    # Build the generation service with existing QueryEngine
    embedding_client = _get_embedding_client()
    query_engine = QueryEngine(session=db, embedding_client=embedding_client)
    gen_service = GenerationService(
        query_engine=query_engine,
        ollama_client=ollama,
    )

    async def event_stream():
        """SSE event generator — yields tokens as 'data:' events."""
        try:
            async for token in gen_service.generate_stream(
                query=request.query,
                user_id=user_id,
                document_ids=request.document_ids,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except OllamaUnavailableError:
            yield f"data: {json.dumps({'error': 'LLM service disconnected during generation'})}\n\n"
        except Exception as exc:
            logger.error("rag.generate.stream_error", error=str(exc))
            yield f"data: {json.dumps({'error': 'Generation failed unexpectedly'})}\n\n"
        finally:
            await ollama.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
