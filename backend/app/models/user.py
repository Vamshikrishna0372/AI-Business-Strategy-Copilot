"""User MongoDB Model for Authentication & Profile Management."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import EmailStr, Field
from app.models.base import MongoBaseModel
from app.common.enums import UserRole


class User(MongoBaseModel):
    """User collection model."""

    email: EmailStr = Field(..., description="User email address")
    hashed_password: Optional[str] = Field(default=None, description="Bcrypt hashed password (optional for OAuth)")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(default=UserRole.FOUNDER, description="User system role (FOUNDER or ADMIN)")
    is_active: bool = Field(default=True, description="Account active status")
    is_verified: bool = Field(default=True, description="Email verification status")
    avatar_url: Optional[str] = Field(default=None, description="Profile picture URL")
    google_id: Optional[str] = Field(default=None, description="Google OAuth Provider ID")
    timezone: str = Field(default="UTC", description="Preferred user timezone")
    last_login_at: Optional[datetime] = Field(default=None, description="Last login timestamp")
    preferences: Dict[str, Any] = Field(
        default_factory=lambda: {
            "active_startup_id": None,
            "theme": "dark",
            "notifications_enabled": True,
        },
        description="User account preferences dictionary including active startup context",
    )
