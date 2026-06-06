import asyncio
from sqlalchemy import text
from v1.app.core.database import async_session_maker

async def check():
    async with async_session_maker() as db:
        res = await db.execute(text("SELECT id, title, processing_status, processing_error FROM documents"))
        for row in res.fetchall():
            print(f"Doc: {row.title} | Status: {row.processing_status} | Error: {row.processing_error}")

if __name__ == "__main__":
    asyncio.run(check())
