"""Authentication API Endpoint Router."""

from fastapi import APIRouter, Depends, Request, status
from app.common.responses import ResponseModel
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_activity_log_repository, get_user_repository
from app.models.user import User
from app.repositories.activity_log_repository import ActivityLogRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import EmailLoginRequest, GoogleLoginRequest, LogoutResponse, RefreshTokenRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    activity_repo: ActivityLogRepository = Depends(get_activity_log_repository),
) -> AuthService:
    """Dependency provider for AuthService."""
    return AuthService(user_repository=user_repo, activity_log_repository=activity_repo)


@router.post(
    "/login",
    response_model=ResponseModel[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Email & Password Founder Login",
    description="Authenticates or registers founder using email address.",
)
async def email_login(
    payload: EmailLoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Email authentication endpoint."""
    ip_address = request.client.host if request.client else None
    tokens = await auth_service.login_with_email(payload, ip_address=ip_address)
    return ResponseModel(
        success=True,
        message="Authentication successful",
        data=tokens,
    )


@router.post(
    "/google",
    response_model=ResponseModel[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Google OAuth Login / Registration",
    description="Authenticates or registers founder using Google OAuth ID token.",
)
async def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Google OAuth authentication endpoint."""
    ip_address = request.client.host if request.client else None
    tokens = await auth_service.login_with_google(payload, ip_address=ip_address)
    return ResponseModel(
        success=True,
        message="Google authentication successful",
        data=tokens,
    )


@router.post(
    "/refresh",
    response_model=ResponseModel[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Refresh Session JWT Tokens",
    description="Exchanges valid refresh token for new access and refresh token pair.",
)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Refresh token session endpoint."""
    tokens = await auth_service.refresh_tokens(payload.refresh_token)
    return ResponseModel(
        success=True,
        message="Session refreshed successfully",
        data=tokens,
    )


@router.post(
    "/logout",
    response_model=ResponseModel[LogoutResponse],
    status_code=status.HTTP_200_OK,
    summary="Logout User Session",
    description="Logs out user session.",
)
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint."""
    return ResponseModel(
        success=True,
        message="Logout successful",
        data=LogoutResponse(message=f"User {current_user.email} successfully logged out"),
    )


@router.get(
    "/me",
    response_model=ResponseModel[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Current Authenticated User Profile",
    description="Returns current authenticated user details.",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Current authenticated user profile endpoint."""
    user_response = UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        google_id=current_user.google_id,
        role=current_user.role,
        timezone=current_user.timezone,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        preferences=current_user.preferences or {},
    )
    return ResponseModel(
        success=True,
        message="Current user profile retrieved",
        data=user_response,
    )
