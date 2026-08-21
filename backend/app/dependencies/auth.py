"""Authentication, User Context, Role & Active Startup FastAPI Dependencies."""

from typing import List, Optional
from bson import ObjectId
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth.jwt import JWTAuthHandler
from app.common.enums import UserRole
from app.core.exceptions import ForbiddenException, NotFoundException, UnauthorizedException
from app.database.collections import CollectionName
from app.models.startup import Startup
from app.models.user import User
from app.repositories.startup_repository import StartupRepository
from app.repositories.user_repository import UserRepository

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> User:
    """FastAPI Dependency extracting and validating authenticated current User model from JWT Bearer token."""
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication bearer token required")

    token = credentials.credentials
    payload = JWTAuthHandler.verify_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid, malformed, or expired access token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload structure")

    user_repo = UserRepository(collection_name=CollectionName.USERS.value)
    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User account is inactive or no longer exists")

    return user


def require_roles(allowed_roles: List[UserRole]):
    """Dependency factory enforcing Role-Based Access Control (RBAC)."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(f"Access forbidden: User role '{current_user.role.value}' lacks required permissions")
        return current_user

    return role_checker


require_admin = require_roles([UserRole.ADMIN])


async def get_current_active_startup(
    x_startup_id: Optional[str] = Header(default=None, alias="X-Startup-ID"),
    current_user: User = Depends(get_current_user),
) -> Startup:
    """FastAPI Dependency resolving current active Startup Workspace context."""
    startup_repo = StartupRepository(collection_name=CollectionName.STARTUPS.value)
    
    # Sanitize literal string "null" / "undefined" / empty values from frontend
    clean_id = x_startup_id
    if clean_id in (None, "", "null", "undefined", "None"):
        clean_id = current_user.preferences.get("active_startup_id")
        if clean_id in (None, "", "null", "undefined", "None"):
            clean_id = None

    startup: Optional[Startup] = None
    if clean_id and ObjectId.is_valid(clean_id):
        startup = await startup_repo.get_by_owner_and_id(str(current_user.id), str(clean_id))

    # Auto-fallback: Find first startup owned by user if specified ID was invalid or missing
    if not startup:
        user_startups = await startup_repo.get_startups_by_owner(str(current_user.id))
        if user_startups:
            startup = user_startups[0]

    # Failsafe: Return/create workspace context if user has no startups yet
    if not startup:
        startup = await startup_repo.create(
            Startup(
                name=f"{current_user.full_name}'s Startup",
                owner_id=current_user.id,
                industry="Technology & AI",
                stage="seed",
            )
        )

    return startup
