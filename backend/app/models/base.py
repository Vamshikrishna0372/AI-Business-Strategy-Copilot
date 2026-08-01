"""Base MongoDB Model using Pydantic V2 and ObjectId handling."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.common.types import PyObjectId


def current_utc_time() -> datetime:
    return datetime.now(timezone.utc)


class MongoBaseModel(BaseModel):
    """Base class for all MongoDB collection Pydantic V2 models."""

    id: Optional[PyObjectId] = Field(default=None, alias="_id", description="MongoDB ObjectId")
    created_at: datetime = Field(default_factory=current_utc_time, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=current_utc_time, description="Last update timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Flexible metadata dictionary")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

