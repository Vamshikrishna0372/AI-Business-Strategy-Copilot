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
    acknowledged: Optional[str] = None
    rationale: Optional[str] = None


class StartInterviewRequest(BaseSchema):
    """Payload to start or restart a dynamic AI business interview."""
    initial_notes: Optional[str] = Field(default=None, max_length=1000)


class SubmitAnswerRequest(BaseSchema):
    """Payload to submit or update an answer to an interview question."""
    question_id: str = Field(..., description="Target question ID")
    question: str = Field(..., description="Target question text")
    answer: str = Field(..., min_length=1, max_length=3000, description="Founder provided answer text")
    category: Optional[str] = Field(default="General", description="Category section name")


class PauseInterviewRequest(BaseSchema):
    """Payload to pause an interview session."""
    reason: Optional[str] = Field(default=None, max_length=500)


class ResumeInterviewRequest(BaseSchema):
    """Payload to resume a paused interview session."""
    pass


class StopInterviewRequest(BaseSchema):
    """Payload to stop an interview session."""
    reason: Optional[str] = Field(default=None, max_length=500)


class RestartInterviewRequest(BaseSchema):
    """Payload to restart an interview session after confirmation."""
    confirm: bool = Field(default=True, description="Must be true to reset existing interview session")


class InterviewStepResponse(BaseSchema):
    """Response returned after starting, answering, pausing, or resuming an interview."""
    interview_id: str
    current_section: str
    current_question_number: int = 1
    total_questions: int = 10
    progress_percentage: float = 0.0
    status: str = "started"
    next_question_id: str
    next_question: str
    question_type: str = "text"
    acknowledged_previous: Optional[str] = None
    rationale_for_question: Optional[str] = None
    completed: bool = False
    qa_history: List[QAPairSchema] = Field(default_factory=list)
    extracted_knowledge: Dict[str, Any] = Field(default_factory=dict)
    summary_so_far: Optional[str] = None
    confidence: float = 0.95
    estimated_time_remaining_minutes: int = 10


class InterviewResponse(BaseSchema):
    """Full AI Interview thread details."""
    id: str
    startup_id: str
    user_id: str
    title: str
    status: str
    current_question_number: int = 1
    total_questions: int = 10
    progress_percentage: float = 0.0
    qa_history: List[QAPairSchema] = Field(default_factory=list)
    extracted_knowledge: Dict[str, Any] = Field(default_factory=dict)
    knowledge_base: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    resumed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class BusinessKnowledgeResponse(BaseSchema):
    """Structured Business Knowledge Base extracted from AI Business Interview."""
    startup_id: str
    interview_id: str
    status: str
    knowledge: Dict[str, Any]
    knowledge_completion_percentage: float
    confidence_score: float
    updated_at: datetime

