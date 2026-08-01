"""Authentication Domain Service Layer."""

from typing import Optional
from app.auth.jwt import JWTAuthHandler
from app.auth.oauth import GoogleOAuthHandler
from app.common.enums import ActivityAction, UserRole
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.activity_log_repository import ActivityLogRepository
from app.schemas.auth import EmailLoginRequest, GoogleLoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.base import BaseService


class AuthService(BaseService[UserRepository]):
    """Authentication business logic service."""

    def __init__(self, user_repository: UserRepository, activity_log_repository: ActivityLogRepository):
        super().__init__(repository=user_repository)
        self.activity_log_repository = activity_log_repository

    async def login_with_email(
        self, request_payload: EmailLoginRequest, ip_address: Optional[str] = None
    ) -> TokenResponse:
        """Authenticates or registers user using email address, issuing JWT tokens."""
        email = request_payload.email.lower().strip()
        full_name = request_payload.full_name or "Founder User"

        user = await self.repository.get_by_email(email)
        if not user:
            new_user_model = User(
                email=email,
                full_name=full_name,
                role=UserRole.FOUNDER,
                is_active=True,
                is_verified=True,
            )
            user = await self.repository.create(new_user_model)

        user = await self.repository.update_last_login(str(user.id)) or user
        user_id_str = str(user.id)
        access_token, refresh_token, expires_in = JWTAuthHandler.create_tokens_for_user(
            user_id=user_id_str, role=user.role.value
        )

        await self.activity_log_repository.log_activity(
            action=ActivityAction.LOGIN,
            entity_type="user",
            entity_id=user_id_str,
            user_id_str=user_id_str,
            description=f"User {user.email} logged in",
            ip_address=ip_address,
        )

        user_response = UserResponse(
            id=user_id_str,
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

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=user_response,
        )

    async def login_with_google(
        self, request_payload: GoogleLoginRequest, ip_address: Optional[str] = None
    ) -> TokenResponse:
        """Authenticates user via Google OAuth ID token, creating profile if new."""
        google_payload = await GoogleOAuthHandler.verify_google_id_token(request_payload.id_token)
        if not google_payload:
            raise UnauthorizedException("Invalid or unverified Google OAuth token")

        google_id = google_payload.get("sub")
        email = request_payload.email or google_payload.get("email")
        full_name = request_payload.full_name or google_payload.get("name") or "Founder"
        avatar_url = request_payload.avatar_url or google_payload.get("picture")

        if not email:
            raise BadRequestException("Google login payload must include an email address")

        # Find existing user by Google ID or Email
        user = await self.repository.get_by_google_id(google_id)
        if not user:
            user = await self.repository.get_by_email(email)

        if not user:
            # Create new founder user profile
            new_user_model = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                avatar_url=avatar_url,
                role=UserRole.FOUNDER,
                is_active=True,
                is_verified=True,
            )
            user = await self.repository.create(new_user_model)
        else:
            # Update existing user profile details
            update_data = {}
            if not user.google_id and google_id:
                update_data["google_id"] = google_id
            if avatar_url and user.avatar_url != avatar_url:
                update_data["avatar_url"] = avatar_url

            if update_data:
                user = await self.repository.update(str(user.id), update_data) or user

        # Update last login timestamp
        user = await self.repository.update_last_login(str(user.id)) or user

        # Issue JWT Access and Refresh Tokens
        user_id_str = str(user.id)
        access_token, refresh_token, expires_in = JWTAuthHandler.create_tokens_for_user(
            user_id=user_id_str, role=user.role.value
        )

        # Audit Activity Logging
        await self.activity_log_repository.log_activity(
            action=ActivityAction.LOGIN,
            entity_type="user",
            entity_id=user_id_str,
            user_id_str=user_id_str,
            description=f"User {user.email} logged in via Google OAuth",
            ip_address=ip_address,
        )

        user_response = UserResponse(
            id=user_id_str,
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

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=user_response,
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """Refreshes session and issues new JWT tokens using valid refresh token."""
        payload = JWTAuthHandler.verify_refresh_token(refresh_token)
        if not payload:
            raise UnauthorizedException("Invalid, revoked, or expired refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Malformed token payload")

        user = await self.repository.get_by_id(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User account is inactive or no longer exists")

        # Issue new token pair
        user_id_str = str(user.id)
        new_access_token, new_refresh_token, expires_in = JWTAuthHandler.create_tokens_for_user(
            user_id=user_id_str, role=user.role.value
        )

        user_response = UserResponse(
            id=user_id_str,
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

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=user_response,
        )
