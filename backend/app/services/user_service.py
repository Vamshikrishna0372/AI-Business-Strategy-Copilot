"""User Profile & Preferences Service Layer."""

from app.core.exceptions import NotFoundException
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserProfileUpdate, UserPreferencesUpdate, UserResponse
from app.services.base import BaseService


class UserService(BaseService[UserRepository]):
    """User profile management service."""

    def __init__(self, user_repository: UserRepository):
        super().__init__(repository=user_repository)

    async def get_profile(self, user_id_str: str) -> UserResponse:
        """Retrieves user profile response."""
        user = await self.repository.get_by_id(user_id_str)
        if not user:
            raise NotFoundException("User profile not found")

        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            google_id=user.google_id,
            role=user.role,
            timezone=user.timezone,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            preferences=user.preferences or {},
        )

    async def update_profile(self, user_id_str: str, update_dto: UserProfileUpdate) -> UserResponse:
        """Updates user profile fields."""
        update_dict = update_dto.model_dump(exclude_unset=True)
        if not update_dict:
            return await self.get_profile(user_id_str)

        user = await self.repository.update(user_id_str, update_dict)
        if not user:
            raise NotFoundException("User profile not found")

        return await self.get_profile(user_id_str)

    async def update_preferences(self, user_id_str: str, pref_dto: UserPreferencesUpdate) -> UserResponse:
        """Updates user preference settings."""
        pref_dict = pref_dto.model_dump(exclude_unset=True)
        if not pref_dict:
            return await self.get_profile(user_id_str)

        user = await self.repository.update_preferences(user_id_str, pref_dict)
        if not user:
            raise NotFoundException("User profile not found")

        return await self.get_profile(user_id_str)
