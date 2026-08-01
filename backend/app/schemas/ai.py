"""Generic AI Engine Schemas and DTOs."""

from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema


class AIGenerateRequest(BaseSchema):
    """Payload for direct AI module execution."""
    module: str = Field(default="general", description="Target AI strategy module")
    prompt: str = Field(..., min_length=1, max_length=5000, description="User instruction or topic")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional parameters")


class AIGenerateResponse(BaseSchema):
    """Standardized AI response contract returned across all providers & modules."""
    success: bool = True
    message: str = "AI generation completed"
    data: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    suggestions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AIHealthResponse(BaseSchema):
    """AI Engine health check status response."""
    status: str
    primary_provider: str
    fallback_provider: str
    healthy: bool
