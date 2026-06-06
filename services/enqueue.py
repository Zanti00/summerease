import asyncio
from sqlalchemy import text
from redis import Redis
from rq import Queue
from v1.app.core.database import async_session_maker
from v1.app.core.config import get_settings

async def enqueue_all_incomplete():
    settings = get_settings()
    redis_conn = Redis.from_url(settings.REDIS_URL)
    rag_queue = Queue("rag_processing", connection=redis_conn)

    async with async_session_maker() as db:
        res = await db.execute(text("""
            SELECT id, title, storage_path, processing_status 
            FROM documents 
            WHERE deleted_at IS NULL AND processing_status != 'completed'
        """))
        docs = res.fetchall()
        if not docs:
            print("No incomplete documents found.")
            return

        for doc in docs:
            print(f"Enqueuing document: {doc.title} (ID: {doc.id}, Status: {doc.processing_status})")
            await db.execute(text("UPDATE documents SET processing_status = 'pending', processing_error = NULL WHERE id = :id"), {"id": doc.id})
            await db.commit()
            
            rag_queue.enqueue(
                "v1.app.rag.worker_tasks.process_document_task",
                str(doc.id),
                doc.storage_path,
                job_timeout="30m",
            )
        print("Successfully enqueued all incomplete documents!")

if __name__ == "__main__":
    asyncio.run(enqueue_all_incomplete())
