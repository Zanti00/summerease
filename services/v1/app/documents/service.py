import os
import uuid
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Document, DocumentVersion
from supabase import create_client, Client
import mammoth
import nh3

from ..core.config import get_settings

settings = get_settings()
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def extract_and_sanitize_docx(file: UploadFile) -> str:
    content = await file.read()
    
    # Mammoth requires a file-like object, but we have bytes.
    import io
    file_stream = io.BytesIO(content)
    
    # Convert DOCX to HTML
    result = mammoth.convert_to_html(file_stream)
    html = result.value
    
    # Sanitize the HTML
    allowed_tags = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "ol", "ul", "li", "a", "table", "tr", "td", "th", "tbody", "thead", "blockquote", "pre", "code", "img"}
    allowed_attributes = {"a": {"href", "title"}, "img": {"src", "alt"}}
    
    sanitized_html = nh3.clean(html, tags=allowed_tags, attributes=allowed_attributes)
    
    await file.seek(0)
    return sanitized_html

async def upload_document_to_supabase(file: UploadFile, owner_id: str, doc_id: uuid.UUID) -> str:
    if not supabase:
        return ""
    
    file_path = f"{owner_id}/{doc_id}_{file.filename}"
    content = await file.read()
    
    supabase.storage.from_("documents").upload(
        path=file_path,
        file=content,
        file_options={"content-type": file.content_type}
    )
    
    url = supabase.storage.from_("documents").get_public_url(file_path)
    await file.seek(0)
    return url

async def create_document(db: AsyncSession, owner_id: str, file: UploadFile) -> Document:
    doc_id = uuid.uuid4()
    
    # 1. Upload original file
    file_url = await upload_document_to_supabase(file, owner_id, doc_id)
    
    # 2. Extract and sanitize
    html_content = ""
    if file.filename.endswith(".docx"):
        html_content = await extract_and_sanitize_docx(file)
    elif file.filename.endswith((".txt", ".md")):
        content = await file.read()
        html_content = f"<p>{nh3.clean(content.decode('utf-8'))}</p>"
        await file.seek(0)
        
    file_size = file.size

    # 3. Create record
    document = Document(
        id=doc_id,
        owner_id=uuid.UUID(owner_id),
        title=file.filename,
        original_file_url=file_url,
        content_html=html_content,
        file_type=file.content_type,
        file_size=file_size
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document

async def get_document(db: AsyncSession, doc_id: str, owner_id: str) -> Document:
    stmt = select(Document).where(Document.id == uuid.UUID(doc_id), Document.owner_id == uuid.UUID(owner_id), Document.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def delete_document(db: AsyncSession, doc_id: str, owner_id: str):
    # For hard delete, we don't need deleted_at.is_(None) check if we want to delete already soft-deleted docs as well,
    # but the get_document function currently filters by deleted_at.is_(None).
    doc = await get_document(db, doc_id, owner_id)
    if doc:
        # Delete from Supabase storage
        if supabase and doc.original_file_url:
            # Reconstruct file path. It was saved as f"{owner_id}/{doc_id}_{file.filename}"
            # where title is file.filename
            file_path = f"{owner_id}/{doc_id}_{doc.title}"
            try:
                supabase.storage.from_("documents").remove([file_path])
            except Exception as e:
                print(f"Failed to delete file from bucket: {e}")
                
        await db.delete(doc)
        await db.commit()
    return doc
