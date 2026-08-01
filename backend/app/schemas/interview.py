"""AI Business Interview API Schemas and DTOs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema


class QAPairSchema(BaseSchema):
    """Question Answer pair schema."""
    question_id: str
    question: str
    answer: Optional[str] = None
    category: Optional[str] = None


class StartInterviewRequest(BaseSchema):
    """Payload to start a dynamic AI business interview."""
    initial_notes: Optional[str] = Field(default=None, max_length=1000)


class SubmitAnswerRequest(BaseSchema):
    """Payload to submit or update an answer to an interview question."""
    question_id: str = Field(..., description="Target question ID")
    question: str = Field(..., description="Target question text")
    answer: str = Field(..., min_length=1, max_length=3000, description="Founder provided answer text")
    category: Optional[str] = Field(default="General", description="Category section name")


class InterviewStepResponse(BaseSchema):
    """Response returned after starting or submitting an interview answer."""
    interview_id: str
    current_section: str
    next_question_id: str
    next_question: str
    question_type: str = "text"
    completed: bool = False
    qa_history: List[QAPairSchema] = Field(default_factory=list)
    summary_so_far: Optional[str] = None


class InterviewResponse(BaseSchema):
    """Full AI Interview thread details."""
    id: str
    startup_id: str
    user_id: str
    title: str
    status: str
    qa_history: List[QAPairSchema] = Field(default_factory=list)
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
