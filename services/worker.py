import os
import asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from v1.app.documents.models import Document, DocumentVersion

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:admin@db:5432/summerease")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def async_save_document(doc_id: str, content: dict, owner_id: str):
    import uuid
    from datetime import datetime
    
    async with async_session_maker() as session:
        # Update main document
        stmt = (
            update(Document)
            .where(Document.id == uuid.UUID(doc_id), Document.owner_id == uuid.UUID(owner_id))
            .values(content=content, updated_at=datetime.utcnow())
        )
        await session.execute(stmt)
        
        # Optionally create a version snapshot here (e.g. every 10th save or if enough time passed)
        # For this exercise, we just save to the main document to avoid exploding table size on autosave
        
        await session.commit()

def save_document_task(doc_id: str, content: dict, owner_id: str):
    """Synchronous wrapper for RQ worker to run the async task."""
    asyncio.run(async_save_document(doc_id, content, owner_id))
