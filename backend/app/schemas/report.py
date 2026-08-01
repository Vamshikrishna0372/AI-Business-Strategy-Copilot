"""Report API schemas DTOs."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import Field
from app.schemas.base import BaseSchema
from app.common.enums import ReportType


class ReportResponse(BaseSchema):
    """Report response schema."""

    id: str = Field(...)
    startup_id: str = Field(...)
    interview_id: Optional[str] = Field(default=None)
    report_type: ReportType = Field(...)
    title: str = Field(...)
    content: Dict[str, Any] = Field(default_factory=dict)
    pdf_file_id: Optional[str] = Field(default=None)
    created_at: datetime
    updated_at: datetime
