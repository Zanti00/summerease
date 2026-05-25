import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

# Get from settings which automatically parses .env
DATABASE_URL = get_settings().DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with async_session_maker() as session:
        yield session
