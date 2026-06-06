import asyncio
import os
import sys

# Add current directory to path to ensure relative imports resolve correctly in Docker
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from v1.app.core.database import async_session_maker
from v1.app.rag.service import RAGService

def process_document_task(document_id: str):
    """Synchronous entry point for the RQ worker.
    Creates an asyncio event loop to run the async database session and ingestion service.
    """
    async def _run():
        service = RAGService()
        async with async_session_maker() as db:
            await service.run_ingestion_pipeline(db, document_id)
            
    asyncio.run(_run())
