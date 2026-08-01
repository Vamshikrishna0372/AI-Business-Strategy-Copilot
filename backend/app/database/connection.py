"""Motor AsyncIOMotorClient database connection manager with automatic event loop binding."""

import asyncio
from typing import Optional
import motor.frameworks.asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import DatabaseException


class DatabaseManager:
    """Singleton MongoDB Atlas Async Motor Connection Manager with Event Loop awareness."""

    _client: Optional[AsyncIOMotorClient] = None
    _active_loop: Optional[asyncio.AbstractEventLoop] = None

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        """Returns or instantiates AsyncIOMotorClient bound to the current running event loop."""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if cls._client is None or cls._active_loop is not current_loop:
            if cls._client is not None:
                try:
                    cls._client.close()
                except Exception:
                    pass
            # Reset Motor asyncio executor to bind to active running loop
            motor.frameworks.asyncio._EXECUTOR = None

            cls._client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                maxPoolSize=100,
                minPoolSize=10,
                serverSelectionTimeoutMS=5000,
            )
            cls._active_loop = current_loop
        return cls._client

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Returns active database instance bound to current running event loop."""
        client = cls.get_client()
        return client[settings.DATABASE_NAME]

    @classmethod
    async def connect_to_database(cls) -> None:
        """Establishes MongoDB connection pool on application startup."""
        try:
            client = cls.get_client()
            await client.admin.command("ping")
            logger.info(f"Successfully connected to MongoDB Atlas database: {settings.DATABASE_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {str(e)}")
            cls._client = None
            cls._active_loop = None
            raise DatabaseException(f"Could not establish database connection: {str(e)}")

    @classmethod
    async def close_database_connection(cls) -> None:
        """Closes MongoDB connection pool on application shutdown."""
        if cls._client is not None:
            logger.info("Closing MongoDB database connection pool...")
            try:
                cls._client.close()
            except Exception:
                pass
            cls._client = None
            cls._active_loop = None
            logger.info("MongoDB connection pool closed successfully.")

    @classmethod
    async def ping_health(cls) -> bool:
        """Pings MongoDB database to verify connection health."""
        try:
            client = cls.get_client()
            await client.admin.command("ping")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False


db_manager = DatabaseManager()
