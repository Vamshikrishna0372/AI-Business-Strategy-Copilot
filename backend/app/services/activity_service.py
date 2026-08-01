"""Activity Logging Service for system audit logs."""

import logging
from typing import Optional
from bson import ObjectId
from app.database.collections import CollectionName, get_collection

logger = logging.getLogger(__name__)


class ActivityLogger:
    """Helper to record user and system actions into activity_logs collection."""

    @staticmethod
    async def log_activity(
        action: str,
        entity_type: str,
        description: str,
        user_id_str: Optional[str] = None,
        startup_id_str: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> bool:
        """Inserts an activity log entry into MongoDB."""
        try:
            col = get_collection(CollectionName.ACTIVITY_LOGS)
            doc = {
                "action": action,
                "entity_type": entity_type,
                "description": description,
                "user_id": ObjectId(user_id_str) if user_id_str and ObjectId.is_valid(user_id_str) else None,
                "startup_id": ObjectId(startup_id_str) if startup_id_str and ObjectId.is_valid(startup_id_str) else None,
                "entity_id": entity_id,
            }
            await col.insert_one(doc)
            return True
        except Exception as exc:
            logger.error(f"[Activity Logger Error] Failed to record activity log: {exc}")
            return False
