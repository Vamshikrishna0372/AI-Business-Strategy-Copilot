"""User collection repository."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.database.collections import CollectionName
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """User database repository."""

    def __init__(self, collection_name: str = CollectionName.USERS.value):
        super().__init__(collection_name=collection_name, model_class=User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Finds user by email address."""
        if not email:
            return None
        return await self.find_one({"email": email.lower().strip()})

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Finds user by Google OAuth Provider ID."""
        if not google_id:
            return None
        return await self.find_one({"google_id": google_id})

    async def update_last_login(self, user_id_str: str) -> Optional[User]:
        """Updates last login timestamp for user."""
        return await self.update(user_id_str, {"last_login_at": datetime.now(timezone.utc)})

    async def update_preferences(self, user_id_str: str, new_preferences: Dict[str, Any]) -> Optional[User]:
        """Updates user preferences dictionary."""
        user = await self.get_by_id(user_id_str)
        if not user:
            return None
        current_prefs = user.preferences or {}
        current_prefs.update(new_preferences)
        return await self.update(user_id_str, {"preferences": current_prefs})
