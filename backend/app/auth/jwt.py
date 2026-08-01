"""JWT Authentication Handler."""

from typing import Dict, Any, Optional, Tuple
from app.core.security import create_access_token, create_refresh_token, decode_token


class JWTAuthHandler:
    """JWT Token management helper."""

    @staticmethod
    def create_tokens_for_user(user_id: str, role: str) -> Tuple[str, str, int]:
        """Generates access and refresh tokens for user ID and role."""
        payload = {"sub": user_id, "role": role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)
        expires_in = 86400  # 24 hours in seconds
        return access_token, refresh_token, expires_in

    @staticmethod
    def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Verifies access token payload."""
        return decode_token(token, expected_type="access")

    @staticmethod
    def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
        """Verifies refresh token payload."""
        return decode_token(token, expected_type="refresh")
