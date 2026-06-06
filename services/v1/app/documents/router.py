import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict
from redis import Redis
from rq import Queue

from v1.app.core.database import get_db
from v1.app.auth.nexusauth_client import get_current_user
from v1.app.core.config import get_settings
from . import service

router = APIRouter(prefix="/documents", tags=["Documents"])

# Configure RQ queue
settings = get_settings()
redis_url = settings.REDIS_URL
redis_conn = Redis.from_url(redis_url)
autosave_queue = Queue("documents_autosave", connection=redis_conn)
rag_queue = Queue("rag_processing", connection=redis_conn)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail=f"User ID missing in payload: {current_user}")
    
    # Validate extension
    allowed_exts = (".pdf", ".docx", ".txt", ".md")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: .pdf, .docx, .txt, .md")
    
    document = await service.create_document(db, str(user_id), file)
    
    # Enqueue RAG processing job
    try:
        rag_queue.enqueue(
            "v1.app.rag.worker_tasks.process_document_task",
            str(document.id),
            document.storage_path,
            job_timeout="30m",
        )
    except Exception as e:
        # Continue - document is created, processing can be retried
        pass
        
    return {
        "id": document.id,
        "title": document.title,
        "file_url": document.original_file_url,
        "created_at": document.created_at
    }

@router.get("", include_in_schema=False)
@router.get("/")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail=f"User ID missing in payload: {current_user}")
    
    from sqlalchemy import select
    from .models import Document
    
    stmt = select(Document).where(Document.owner_id == user_id).order_by(Document.updated_at.desc())
    result = await db.execute(stmt)
    documents = result.scalars().all()
    
    return [
        {
            "id": str(doc.id),
            "title": doc.title,
            "original_file_url": doc.original_file_url,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at
        }
        for doc in documents
    ]

@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail=f"User ID missing in payload: {current_user}")
        
    document = await service.get_document(db, doc_id, str(user_id))
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "id": document.id,
        "title": document.title,
        "content": document.content,
        "content_html": document.content_html,
        "original_file_url": document.original_file_url,
        "is_autosave_enabled": document.is_autosave_enabled,
        "updated_at": document.updated_at
    }

@router.put("/{doc_id}")
async def autosave_document(
    doc_id: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail=f"User ID missing in payload: {current_user}")
        
    # Verify ownership before queuing
    document = await service.get_document(db, doc_id, str(user_id))
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Enqueue to RQ or fallback to FastAPI background tasks
    content = payload.get("content", {})
    content_html = payload.get("content_html", "")
    is_autosave_enabled = payload.get("is_autosave_enabled", None)
    title = payload.get("title", None)
    try:
        autosave_queue.enqueue(
            "worker.save_document_task",
            doc_id,
            content,
            content_html,
            str(user_id),
            is_autosave_enabled,
            title
        )
    except Exception as e:
        print(f"Redis enqueue failed ({e}), falling back to FastAPI BackgroundTasks")
        from worker import async_save_document
        background_tasks.add_task(async_save_document, doc_id, content, content_html, str(user_id), is_autosave_enabled, title)
    
    return {"status": "queued"}

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.get("id", current_user.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail=f"User ID missing in payload: {current_user}")
        
    doc = await service.delete_document(db, doc_id, str(user_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {"status": "deleted"}
