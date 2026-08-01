"""Database accessor helpers and FastAPI dependency injection provider."""

from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database.connection import DatabaseManager


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI Dependency for accessing active Motor Database instance."""
    db = DatabaseManager.get_database()
    try:
        yield db
    finally:
        pass
