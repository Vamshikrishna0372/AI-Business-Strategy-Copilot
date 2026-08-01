"""Notification MongoDB Model."""

from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.enums import NotificationType
from app.common.types import PyObjectId


class Notification(MongoBaseModel):
    """System Notification collection model."""

    user_id: PyObjectId = Field(..., description="Recipient user ID")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message body")
    type: NotificationType = Field(default=NotificationType.SYSTEM, description="Notification classification")
    is_read: bool = Field(default=False, description="Read status flag")
    link: Optional[str] = Field(default=None, description="Optional action URL link")
