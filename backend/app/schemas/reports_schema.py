"""AI Strategy Report Schemas and DTOs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema


class ReportResponse(BaseSchema):
    """Full strategy report details response schema."""
    id: str
    startup_id: str
    user_id: str
    report_type: str
    title: str
    version: int
    status: str
    ai_provider: str
    confidence: float
    content: Dict[str, Any] = Field(default_factory=dict)
    conversation_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RegenerateReportRequest(BaseSchema):
    """Payload to trigger report regeneration."""
    report_type: str = Field(..., description="Target report type to regenerate")
    custom_instructions: Optional[str] = Field(default=None, max_length=2000, description="Optional extra guidance")
