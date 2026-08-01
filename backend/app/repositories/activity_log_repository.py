"""Activity Log collection repository."""

from typing import Optional
from bson import ObjectId
from app.database.collections import CollectionName
from app.models.activity_log import ActivityLog
from app.common.enums import ActivityAction
from app.repositories.base import BaseRepository


class ActivityLogRepository(BaseRepository[ActivityLog]):
    """Activity Log database repository."""

    def __init__(self, collection_name: str = CollectionName.ACTIVITY_LOGS.value):
        super().__init__(collection_name=collection_name, model_class=ActivityLog)

    async def log_activity(
        self,
        action: ActivityAction,
        entity_type: str,
        description: str,
        user_id_str: Optional[str] = None,
        startup_id_str: Optional[str] = None,
        entity_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Creates and stores a new activity audit log record."""
        user_obj_id = ObjectId(user_id_str) if user_id_str and ObjectId.is_valid(user_id_str) else None
        startup_obj_id = ObjectId(startup_id_str) if startup_id_str and ObjectId.is_valid(startup_id_str) else None

        log_model = ActivityLog(
            user_id=user_obj_id,
            startup_id=startup_obj_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            ip_address=ip_address,
        )
        return await self.create(log_model)
