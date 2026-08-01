"""Background Task MongoDB Model."""

from typing import Any, Dict, Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.enums import TaskStatus
from app.common.types import PyObjectId


class Task(MongoBaseModel):
    """Background Task collection model."""

    task_name: str = Field(..., description="Task name / type identifier")
    startup_id: Optional[PyObjectId] = Field(default=None, description="Associated startup ID")
    user_id: Optional[PyObjectId] = Field(default=None, description="Initiating user ID")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Task execution status")
    progress: int = Field(default=0, ge=0, le=100, description="Task completion percentage (0-100)")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Task execution result payload")
    error: Optional[str] = Field(default=None, description="Error message if task failed")
