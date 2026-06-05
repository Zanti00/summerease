import os
import asyncio
import io
import uuid
from datetime import datetime
from sqlalchemy import update, select
from docx import Document as DocxDocument
from htmldocx import HtmlToDocx
from v1.app.documents.models import Document, DocumentVersion
from v1.app.documents.service import supabase

from v1.app.core.database import async_session_maker

def generate_docx_from_html(html: str) -> bytes:
    doc = DocxDocument()
    new_parser = HtmlToDocx()
    new_parser.add_html_to_document(html, doc)
    
    file_stream = io.BytesIO()
    doc.save(file_stream)
    return file_stream.getvalue()

async def async_save_document(doc_id: str, content: dict, content_html: str, owner_id: str, is_autosave_enabled: bool = None, title: str = None):
    async with async_session_maker() as session:
        # Fetch the document first to check original title and URL
        doc_stmt = select(Document).where(Document.id == uuid.UUID(doc_id), Document.owner_id == uuid.UUID(owner_id))
        result = await session.execute(doc_stmt)
        doc = result.scalar_one_or_none()
        
        if not doc:
            await session.commit()
            return

        update_vals = {"content": content, "updated_at": datetime.utcnow()}
        if content_html:
            update_vals["content_html"] = content_html
        if is_autosave_enabled is not None:
            update_vals["is_autosave_enabled"] = is_autosave_enabled

        # Rename in Supabase if title changed
        current_title = doc.title
        if title is not None and title != current_title:
            update_vals["title"] = title
            current_title = title
            if supabase and doc.original_file_url:
                old_path = f"{owner_id}/{doc_id}_{doc.title}"
                new_path = f"{owner_id}/{doc_id}_{title}"
                try:
                    supabase.storage.from_("documents").move(old_path, new_path)
                    new_url = supabase.storage.from_("documents").get_public_url(new_path)
                    update_vals["original_file_url"] = new_url
                except Exception as e:
                    print(f"Failed to move file in Supabase: {e}")

        stmt = (
            update(Document)
            .where(Document.id == uuid.UUID(doc_id), Document.owner_id == uuid.UUID(owner_id))
            .values(**update_vals)
        )
        await session.execute(stmt)
        
        # Now update the file content in Supabase
        if content_html and supabase:
            file_path = f"{owner_id}/{doc_id}_{current_title}"
            file_bytes = None
            content_type = "application/octet-stream"
            
            if current_title.endswith(".docx"):
                file_bytes = generate_docx_from_html(content_html)
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif current_title.endswith(".txt") or current_title.endswith(".md"):
                import re
                import html as html_module
                # Convert HTML to text
                text = re.sub(r'</?(p|div|h[1-6]|li|tr|br)[^>]*>', '\n', content_html)
                text = re.sub(r'<[^>]+>', '', text)
                text = html_module.unescape(text)
                text = re.sub(r'\n\n+', '\n\n', text).strip()
                file_bytes = text.encode("utf-8")
                content_type = "text/plain" if current_title.endswith(".txt") else "text/markdown"
            
            if file_bytes is not None:
                try:
                    # Overwrite the existing file
                    supabase.storage.from_("documents").update(
                        path=file_path,
                        file=file_bytes,
                        file_options={"content-type": content_type, "upsert": "true", "cache-control": "0"}
                    )
                except Exception as e:
                    print(f"Failed to update file in Supabase: {e}")
                    
        await session.commit()

def save_document_task(doc_id: str, content: dict, content_html: str, owner_id: str, is_autosave_enabled: bool = None, title: str = None):
    """Synchronous wrapper for RQ worker to run the async task."""
    asyncio.run(async_save_document(doc_id, content, content_html, owner_id, is_autosave_enabled, title))
