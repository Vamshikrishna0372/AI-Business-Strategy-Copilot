"""Conversation & Chat Message MongoDB Model."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.base import MongoBaseModel
from app.common.types import PyObjectId


class ChatMessage(BaseModel):
    """Single chat message model within a conversation."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique message ID")
    sender: str = Field(..., description="Sender role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO Timestamp string",
    )
    module: Optional[str] = Field(default="general", description="Associated AI Strategy module")
    is_pinned: bool = Field(default=False, description="Whether message is pinned by founder")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="AI response metadata (confidence, provider_used, execution_time, etc.)",
    )


class Conversation(MongoBaseModel):
    """AI Strategy Chat Conversation collection model with startup workspace isolation."""

    startup_id: PyObjectId = Field(..., description="Startup workspace ID owner")
    user_id: PyObjectId = Field(..., description="Founder user ID owner")
    title: str = Field(default="AI Strategy Chat", description="Conversation topic title")
    module: str = Field(default="general", description="Primary AI module focus")
    is_pinned: bool = Field(default=False, description="Whether conversation is pinned")
    summary: Optional[str] = Field(default=None, description="AI summary of conversation context")
    recent_topics: List[str] = Field(default_factory=list, description="Recent topics discussed")
    suggested_followups: List[str] = Field(default_factory=list, description="AI suggested follow-up prompts")
    messages: List[ChatMessage] = Field(default_factory=list, description="Message thread history")
