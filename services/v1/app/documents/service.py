import os
import uuid
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Document, DocumentVersion
from supabase import create_client, Client
import mammoth
import nh3
import re
import tempfile
import io

def extract_text_from_image(file_bytes: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
        
        # Open image from bytes
        img = Image.open(io.BytesIO(file_bytes))
        
        # Extract text
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"Failed to extract text from image using Tesseract: {e}")
        return ""

def parse_inline_markdown(text: str) -> str:
    # Basic inline parsing for bold and italic
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__(.*?)__", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.*?)\*", r"<em>\1</em>", text)
    text = re.sub(r"_(.*?)_", r"<em>\1</em>", text)
    return text

def markdown_to_html(md: str) -> str:
    lines = md.splitlines()
    html_blocks = []
    in_list = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_list:
                html_blocks.append("</ul>")
                in_list = False
            continue
            
        # Lists
        if stripped.startswith(("- ", "* ", "+ ")):
            if not in_list:
                html_blocks.append("<ul>")
                in_list = True
            content = stripped[2:]
            content = parse_inline_markdown(content)
            html_blocks.append(f"<li>{content}</li>")
            continue
        else:
            if in_list:
                html_blocks.append("</ul>")
                in_list = False
                
        # Headers
        if stripped.startswith("# "):
            html_blocks.append(f"<h1>{parse_inline_markdown(stripped[2:])}</h1>")
        elif stripped.startswith("## "):
            html_blocks.append(f"<h2>{parse_inline_markdown(stripped[3:])}</h2>")
        elif stripped.startswith("### "):
            html_blocks.append(f"<h3>{parse_inline_markdown(stripped[4:])}</h3>")
        elif stripped.startswith("#### "):
            html_blocks.append(f"<h4>{parse_inline_markdown(stripped[5:])}</h4>")
        else:
            html_blocks.append(f"<p>{parse_inline_markdown(stripped)}</p>")
            
    if in_list:
        html_blocks.append("</ul>")
        
    return "\n".join(html_blocks)

from ..core.config import get_settings

settings = get_settings()
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def extract_and_sanitize_docx(file: UploadFile) -> str:
    content = await file.read()
    
    import io
    import base64
    file_stream = io.BytesIO(content)
    
    def convert_image(image):
        with image.open() as image_stream:
            img_data = image_stream.read()
            encoded_src = base64.b64encode(img_data).decode("ascii")
            extracted_text = extract_text_from_image(img_data)
            
        attrs = {
            "src": "data:{0};base64,{1}".format(image.content_type, encoded_src)
        }
        if extracted_text:
            attrs["alt"] = nh3.clean(extracted_text, tags=set()).replace("\n", " ")
        return attrs
    
    # Convert DOCX to HTML
    result = mammoth.convert_to_html(file_stream, convert_image=mammoth.images.img_element(convert_image))
    html = result.value
    
    # Sanitize the HTML
    allowed_tags = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "ol", "ul", "li", "a", "table", "tr", "td", "th", "tbody", "thead", "blockquote", "pre", "code", "img", "br", "i", "span"}
    allowed_attributes = {
        "a": {"href", "title"}, 
        "img": {"src", "alt"},
        "span": {"class", "style"},
        "*": {"style", "class"}
    }
    
    sanitized_html = nh3.clean(html, tags=allowed_tags, attributes=allowed_attributes, url_schemes={"http", "https", "data"})
    
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
    file_path = f"{owner_id}/{doc_id}_{file.filename}"
    
    # Compute SHA-256 file hash
    file_bytes = await file.read()
    import hashlib
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    await file.seek(0)
    
    # 2. Extract and sanitize
    html_content = ""
    filename_lower = file.filename.lower()
    if filename_lower.endswith(".docx"):
        html_content = await extract_and_sanitize_docx(file)
    elif filename_lower.endswith((".txt", ".md")):
        html_content = f"<p>{nh3.clean(file_bytes.decode('utf-8', errors='ignore'))}</p>"
    elif filename_lower.endswith(".pdf"):
        # Write bytes to a temp file since pymupdf4llm operates on file paths
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name
        try:
            import pymupdf4llm
            md_text = pymupdf4llm.to_markdown(temp_path)
            raw_html = markdown_to_html(md_text)
            
            # Sanitize the HTML
            allowed_tags = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "ol", "ul", "li", "a", "table", "tr", "td", "th", "tbody", "thead", "blockquote", "pre", "code", "img", "br", "i", "span"}
            allowed_attributes = {
                "a": {"href", "title"}, 
                "img": {"src", "alt"},
                "span": {"class", "style"},
                "*": {"style", "class"}
            }
            html_content = nh3.clean(raw_html, tags=allowed_tags, attributes=allowed_attributes, url_schemes={"http", "https", "data"})
        except Exception as e:
            print(f"Failed to extract PDF content: {e}")
            html_content = f"<p>PDF Document (Extraction failed: {str(e)})</p>"
        finally:
            # Ensure cleanup of the temporary file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
    file_size = len(file_bytes)

    # 3. Create record
    document = Document(
        id=doc_id,
        owner_id=uuid.UUID(owner_id),
        title=file.filename,
        file_name=file.filename,
        file_hash=file_hash,
        storage_path=file_path,
        original_file_url=file_url,
        content_html=html_content,
        file_type=file.content_type,
        file_size=file_size,
        upload_status="uploaded",
        processing_status="pending"
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
