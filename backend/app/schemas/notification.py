"""Notification API schemas DTOs."""

from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.base import BaseSchema
from app.common.enums import NotificationType


class NotificationResponse(BaseSchema):
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    is_read: bool
    link: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
