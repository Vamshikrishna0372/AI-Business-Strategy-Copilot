"""Async Database Index creation routines optimized for multi-tenant startup workloads."""

from pymongo import IndexModel, ASCENDING, DESCENDING
from app.database.collections import get_collection, CollectionName
from app.core.logging import logger


async def create_database_indexes() -> None:
    """Initializes and ensures all high-performance MongoDB database indexes exist."""
    try:
        logger.info("Initializing database indexes...")

        # Users collection indexes
        users_col = get_collection(CollectionName.USERS)
        await users_col.create_indexes([
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("created_at", DESCENDING)]),
        ])

        # Startups collection indexes
        startups_col = get_collection(CollectionName.STARTUPS)
        await startups_col.create_indexes([
            IndexModel([("owner_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("slug", ASCENDING)], unique=True),
        ])

        # AI Interviews collection indexes
        interviews_col = get_collection(CollectionName.AI_INTERVIEWS)
        await interviews_col.create_indexes([
            IndexModel([("startup_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])

        # AI Reports collection indexes — optimized compound versioning query indexes
        reports_col = get_collection(CollectionName.AI_REPORTS)
        await reports_col.create_indexes([
            IndexModel([("startup_id", ASCENDING), ("report_type", ASCENDING), ("version", DESCENDING)]),
            IndexModel([("startup_id", ASCENDING), ("created_at", DESCENDING)]),
        ])

        # Conversations collection indexes — optimized compound chat retrieval indexes
        conv_col = get_collection(CollectionName.CONVERSATIONS)
        await conv_col.create_indexes([
            IndexModel([("startup_id", ASCENDING), ("updated_at", DESCENDING)]),
            IndexModel([("startup_id", ASCENDING), ("is_pinned", DESCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
        ])

        # Notifications collection indexes
        notif_col = get_collection(CollectionName.NOTIFICATIONS)
        await notif_col.create_indexes([
            IndexModel([("user_id", ASCENDING), ("is_read", ASCENDING), ("created_at", DESCENDING)]),
        ])

        # Activity Logs collection indexes
        activity_col = get_collection(CollectionName.ACTIVITY_LOGS)
        await activity_col.create_indexes([
            IndexModel([("startup_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
        ])

        logger.info("Database indexes successfully initialized.")
    except Exception as e:
        logger.warning(f"Database index creation notice: {str(e)}")
