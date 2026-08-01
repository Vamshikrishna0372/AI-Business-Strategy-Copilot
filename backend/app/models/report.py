"""AI Report MongoDB Model with Versioning and Workspace Isolation."""

from typing import Any, Dict, Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.enums import ReportType
from app.common.types import PyObjectId


class Report(MongoBaseModel):
    """AI Strategy Report collection model with immutable versioning."""

    startup_id: PyObjectId = Field(..., description="Startup workspace ID owner")
    user_id: PyObjectId = Field(..., description="User ID founder owner")
    conversation_id: Optional[PyObjectId] = Field(default=None, description="Associated AI Chat Conversation ID")
    interview_id: Optional[PyObjectId] = Field(default=None, description="Source AI Interview ID if applicable")
    report_type: ReportType = Field(..., description="Type of strategy report")
    title: str = Field(..., description="Report title")
    content: Dict[str, Any] = Field(default_factory=dict, description="Structured report payload/sections")
    version: int = Field(default=1, ge=1, description="Immutable report version number (v1, v2, v3...)")
    status: str = Field(default="completed", description="Report status: 'draft', 'generating', 'completed', 'failed', 'needs_update'")
    ai_provider: str = Field(default="gemini", description="AI Provider used to generate report")
    confidence: float = Field(default=0.95, ge=0.0, le=1.0, description="AI model confidence score")
    pdf_file_id: Optional[PyObjectId] = Field(default=None, description="Associated PDF file ObjectId")
    is_template: bool = Field(default=False, description="Whether report is saved as template")
