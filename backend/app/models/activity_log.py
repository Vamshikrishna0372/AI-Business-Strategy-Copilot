"""Activity Log MongoDB Model."""

from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.enums import ActivityAction
from app.common.types import PyObjectId


class ActivityLog(MongoBaseModel):
    """System Activity Audit Log collection model."""

    user_id: Optional[PyObjectId] = Field(default=None, description="User ID performing activity")
    startup_id: Optional[PyObjectId] = Field(default=None, description="Associated startup workspace ID")
    action: ActivityAction = Field(..., description="Action type performed")
    entity_type: str = Field(..., description="Target entity name (e.g. startup, report)")
    entity_id: Optional[str] = Field(default=None, description="Target entity identifier")
    description: str = Field(..., description="Human readable action summary")
    ip_address: Optional[str] = Field(default=None, description="Request IP address")
