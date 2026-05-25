import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5433/summerease"

async def alter_table():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE documents ALTER COLUMN file_type TYPE VARCHAR(255);"))
    print("Successfully altered documents table")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(alter_table())
