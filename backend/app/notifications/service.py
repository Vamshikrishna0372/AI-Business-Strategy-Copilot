"""Notification Service Dispatcher for in-app user notifications."""

import logging
from typing import Optional
from bson import ObjectId
from app.common.enums import NotificationType
from app.database.collections import CollectionName, get_collection

logger = logging.getLogger(__name__)


class NotificationService:
    """Notification dispatcher persisting alerts into MongoDB."""

    @staticmethod
    async def create_notification(
        user_id_str: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
        link: Optional[str] = None,
    ) -> bool:
        """Persists notification record into MongoDB notifications collection."""
        try:
            if not ObjectId.is_valid(user_id_str):
                return False

            from datetime import datetime, timezone
            col = get_collection(CollectionName.NOTIFICATIONS)
            notif_doc = {
                "user_id": ObjectId(user_id_str),
                "title": title,
                "message": message,
                "type": notification_type.value if hasattr(notification_type, "value") else str(notification_type),
                "is_read": False,
                "link": link,
                "created_at": datetime.now(timezone.utc),
            }
            await col.insert_one(notif_doc)
            logger.info(f"[Notification Created] User: {user_id_str} | Title: '{title}'")
            return True
        except Exception as exc:
            logger.error(f"[Notification Error] Failed to create notification: {exc}")
            return False
