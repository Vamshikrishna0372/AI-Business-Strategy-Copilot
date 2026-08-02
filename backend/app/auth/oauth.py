"""Google OAuth Verification Handler."""

from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class GoogleOAuthHandler:
    """Google OAuth Token Verification Handler."""

    @staticmethod
    async def verify_google_id_token(id_token: str) -> Optional[Dict[str, Any]]:
        """Verifies Google OAuth ID Token or Access Token via Google APIs."""
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

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Try ID token endpoint first
            try:
                url_id = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                res_id = await client.get(url_id)
                if res_id.status_code == 200:
                    data = res_id.json()
                    return {
                        "sub": data.get("sub"),
                        "email": data.get("email"),
                        "name": data.get("name", data.get("email", "").split("@")[0]),
                        "picture": data.get("picture"),
                        "email_verified": data.get("email_verified", True),
                    }
            except Exception as e:
                logger.debug(f"ID token verification attempt note: {e}")

            # 2. Try Access token userinfo endpoint (for OAuth access tokens)
            try:
                url_userinfo = "https://www.googleapis.com/oauth2/v3/userinfo"
                res_user = await client.get(url_userinfo, headers={"Authorization": f"Bearer {id_token}"})
                if res_user.status_code == 200:
                    data = res_user.json()
                    return {
                        "sub": data.get("sub"),
                        "email": data.get("email"),
                        "name": data.get("name", data.get("email", "").split("@")[0]),
                        "picture": data.get("picture"),
                        "email_verified": data.get("email_verified", True),
                    }
            except Exception as e:
                logger.error(f"Error during Google Access Token userinfo verification: {str(e)}")

            logger.warning("Google token verification failed for both ID token and Access token endpoints.")
            return None

