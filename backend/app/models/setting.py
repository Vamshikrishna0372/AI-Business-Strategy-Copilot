"""Setting MongoDB Model."""

from typing import Any
from pydantic import Field
from app.models.base import MongoBaseModel


class Setting(MongoBaseModel):
    """System and Workspace Configurations collection model."""

    key: str = Field(..., description="Configuration unique key")
    value: Any = Field(..., description="Configuration value payload")
    category: str = Field(default="general", description="Settings category group")
    is_public: bool = Field(default=False, description="Public accessibility flag")
