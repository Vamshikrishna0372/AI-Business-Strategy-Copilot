"""Chat & Conversation API Schemas and DTOs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema


class ChatMessageSchema(BaseSchema):
    """Schema representing a single message in a conversation thread."""
    id: str
    sender: str
    content: str
    timestamp: str
    module: Optional[str] = "general"
    is_pinned: bool = False
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CreateConversationRequest(BaseSchema):
    """Payload to create a new chat conversation."""
    title: Optional[str] = Field(default="AI Strategy Chat", max_length=150)
    module: Optional[str] = Field(default="general", max_length=50)


class UpdateConversationRequest(BaseSchema):
    """Payload to rename or pin a conversation."""
    title: Optional[str] = Field(default=None, max_length=150)
    is_pinned: Optional[bool] = None


class SendMessageRequest(BaseSchema):
    """Payload to send a message to AI copilot."""
    content: str = Field(..., min_length=1, max_length=5000, description="User prompt text")
    module: Optional[str] = Field(default="general", description="AI Strategy Module context")


class ConversationResponse(BaseSchema):
    """Full conversation details response schema."""
    id: str
    startup_id: str
    user_id: str
    title: str
    module: str = "general"
    is_pinned: bool = False
    summary: Optional[str] = None
    recent_topics: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    messages: List[ChatMessageSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class SendMessageResponse(BaseSchema):
    """Response containing assistant reply message and updated conversation state."""
    assistant_message: ChatMessageSchema
    conversation: ConversationResponse
