"""AI Interview MongoDB Model."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.base import MongoBaseModel
from app.common.enums import InterviewStatus
from app.common.types import PyObjectId


from datetime import datetime


class QAPair(BaseModel):
    """Question Answer pair entry model."""
    question_id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="AI generated question text")
    answer: Optional[str] = Field(default=None, description="User provided answer")
    category: Optional[str] = Field(default=None, description="Topic category (e.g. Value Prop, Market)")
    acknowledged: Optional[str] = Field(default=None, description="AI acknowledgment of previous answer")
    rationale: Optional[str] = Field(default=None, description="AI explanation for why this question was asked")


class Interview(MongoBaseModel):
    """AI Business Interview collection model."""

    startup_id: PyObjectId = Field(..., description="Startup workspace ID")
    user_id: PyObjectId = Field(..., description="User ID conducting interview")
    title: str = Field(default="AI Strategy Interview", description="Interview title")
    status: InterviewStatus = Field(default=InterviewStatus.NOT_STARTED, description="Interview status")
    current_question_index: int = Field(default=1, description="1-indexed current question number")
    total_questions: int = Field(default=10, description="Total diagnostic questions count")
    qa_history: List[QAPair] = Field(default_factory=list, description="Recorded questions and answers")
    extracted_knowledge: Dict[str, Any] = Field(default_factory=dict, description="Live extracted structured business knowledge")
    knowledge_base: Optional[Dict[str, Any]] = Field(default=None, description="Synthesized Business Knowledge Base")
    ai_memory: Dict[str, Any] = Field(default_factory=dict, description="AI conversation memory and context")
    summary: Optional[str] = Field(default=None, description="AI summary of interview insights")
    started_at: Optional[datetime] = Field(default=None, description="Timestamp when interview started")
    paused_at: Optional[datetime] = Field(default=None, description="Timestamp when interview paused")
    resumed_at: Optional[datetime] = Field(default=None, description="Timestamp when interview resumed")
    completed_at: Optional[datetime] = Field(default=None, description="Timestamp when interview completed")
