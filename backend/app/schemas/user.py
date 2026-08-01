"""User Profile & Preferences Schemas DTOs."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import EmailStr, Field
from app.schemas.base import BaseSchema
from app.common.enums import UserRole


class UserProfileUpdate(BaseSchema):
    """User profile update request schema."""
    full_name: Optional[str] = Field(default=None, description="Full name")
    timezone: Optional[str] = Field(default=None, description="Preferred timezone")
    avatar_url: Optional[str] = Field(default=None, description="Profile avatar picture URL")


class UserPreferencesUpdate(BaseSchema):
    """User preferences update request schema."""
    active_startup_id: Optional[str] = Field(default=None, description="Active Startup Workspace ID")
    theme: Optional[str] = Field(default=None, description="UI Theme preference")
    notifications_enabled: Optional[bool] = Field(default=None, description="Notification preference")


class UserResponse(BaseSchema):
    """User response schema."""
    id: str = Field(..., description="User ObjectId string")
    email: EmailStr = Field(..., description="Email address")
    full_name: str = Field(..., description="Full name")
    avatar_url: Optional[str] = Field(default=None, description="Profile picture URL")
    google_id: Optional[str] = Field(default=None, description="Google OAuth ID")
    role: UserRole = Field(..., description="User role")
    timezone: str = Field(..., description="Timezone")
    is_active: bool = Field(..., description="Account active status")
    is_verified: bool = Field(..., description="Account verification status")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_login_at: Optional[datetime] = Field(default=None, description="Last login timestamp")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="Preferences dictionary")
