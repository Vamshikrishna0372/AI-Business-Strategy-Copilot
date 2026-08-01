"""AI Interview MongoDB Model."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.base import MongoBaseModel
from app.common.enums import InterviewStatus
from app.common.types import PyObjectId


class QAPair(BaseModel):
    """Question Answer pair entry model."""
    question_id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="AI generated question text")
    answer: Optional[str] = Field(default=None, description="User provided answer")
    category: Optional[str] = Field(default=None, description="Topic category (e.g. Value Prop, Market)")


class Interview(MongoBaseModel):
    """AI Business Interview collection model."""

    startup_id: PyObjectId = Field(..., description="Startup workspace ID")
    user_id: PyObjectId = Field(..., description="User ID conducting interview")
    title: str = Field(default="AI Strategy Interview", description="Interview title")
    status: InterviewStatus = Field(default=InterviewStatus.DRAFT, description="Interview status")
    qa_history: List[QAPair] = Field(default_factory=list, description="Recorded questions and answers")
    summary: Optional[str] = Field(default=None, description="AI summary of interview insights")
