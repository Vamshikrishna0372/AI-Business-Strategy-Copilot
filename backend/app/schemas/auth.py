"""Authentication API Schemas DTOs."""

from typing import Optional
from pydantic import EmailStr, Field
from app.schemas.base import BaseSchema
from app.schemas.user import UserResponse


class GoogleLoginRequest(BaseSchema):
    """Google OAuth login payload."""
    id_token: str = Field(..., description="Google OAuth ID Token")
    email: Optional[EmailStr] = Field(default=None, description="Optional override email")
    full_name: Optional[str] = Field(default=None, description="Optional override name")
    avatar_url: Optional[str] = Field(default=None, description="Optional override profile picture URL")


class EmailLoginRequest(BaseSchema):
    """Direct email/founder login payload."""
    email: EmailStr = Field(..., description="User Email Address")
    full_name: Optional[str] = Field(default="Founder User", description="User Full Name")
    password: Optional[str] = Field(default=None, description="User Password")


class RefreshTokenRequest(BaseSchema):
    """JWT refresh token payload."""
    refresh_token: str = Field(..., description="Valid JWT Refresh Token")


class TokenResponse(BaseSchema):
    """Access & Refresh Token payload response."""
    access_token: str = Field(..., description="JWT Access Token")
    refresh_token: str = Field(..., description="JWT Refresh Token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration in seconds")
    user: UserResponse = Field(..., description="Authenticated User profile data")


class LogoutResponse(BaseSchema):
    """Logout response schema."""
    message: str = Field(default="Successfully logged out", description="Logout status message")
