"""Google OAuth Verification Handler."""

from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class GoogleOAuthHandler:
    """Google OAuth Token Verification Handler."""

    @staticmethod
    async def verify_google_id_token(id_token: str) -> Optional[Dict[str, Any]]:
        """Verifies Google OAuth ID Token via Google API tokeninfo endpoint."""
        if not id_token:
            return None

        # Allow test tokens in development or testing mode
        if settings.DEBUG and id_token.startswith("test_google_token_"):
            parts = id_token.split("_")
            email_identifier = parts[-1] if len(parts) > 3 else "user"
            return {
                "sub": f"google_id_{email_identifier}",
                "email": f"{email_identifier}@example.com",
                "name": f"Test User {email_identifier.capitalize()}",
                "picture": "https://lh3.googleusercontent.com/a/default-user",
                "email_verified": True,
            }

        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    # Verify audience if client_id is set
                    if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                        logger.warning(f"Google ID Token client_id mismatch: aud={data.get('aud')}")
                        return None
                    return {
                        "sub": data.get("sub"),
                        "email": data.get("email"),
                        "name": data.get("name", data.get("email", "").split("@")[0]),
                        "picture": data.get("picture"),
                        "email_verified": data.get("email_verified", True),
                    }
                else:
                    logger.warning(f"Google ID token verification failed with status {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error during Google OAuth verification: {str(e)}")
            return None
