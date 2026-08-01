"""Users Profile & Preferences API Endpoint Router."""

from fastapi import APIRouter, Depends, status
from app.common.responses import ResponseModel
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_user_repository
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserPreferencesUpdate, UserProfileUpdate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(user_repository=repo)


@router.get(
    "/profile",
    response_model=ResponseModel[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
    description="Returns the authenticated founder's full profile.",
)
async def get_profile(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    data = await service.get_profile(str(current_user.id))
    return ResponseModel(success=True, message="Profile retrieved successfully", data=data)


@router.put(
    "/profile",
    response_model=ResponseModel[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Update User Profile",
    description="Updates authenticated user's full name, timezone, or avatar.",
)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    data = await service.update_profile(str(current_user.id), payload)
    return ResponseModel(success=True, message="Profile updated successfully", data=data)


@router.patch(
    "/preferences",
    response_model=ResponseModel[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Update User Preferences",
    description="Updates user preferences including active startup workspace context.",
)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    data = await service.update_preferences(str(current_user.id), payload)
    return ResponseModel(success=True, message="Preferences updated successfully", data=data)
