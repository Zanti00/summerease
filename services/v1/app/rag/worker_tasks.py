import asyncio
from v1.app.core.database import async_session_maker
from v1.app.rag.service import RAGService

def process_document_task(document_id: str, storage_path: str = None):
    """Synchronous entry point for the RQ worker.
    Sets up an asyncio event loop to execute the RAG service ingestion pipeline.
    """
    async def _run():
        async with async_session_maker() as db:
            service = RAGService(session=db)
            await service.run_ingestion_pipeline(db, document_id)
            
    asyncio.run(_run())
