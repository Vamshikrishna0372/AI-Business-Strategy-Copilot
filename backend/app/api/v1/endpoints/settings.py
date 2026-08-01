"""Settings API endpoint router."""

from fastapi import APIRouter, status
from app.common.responses import PaginatedResponseModel
from app.schemas.setting import SettingResponse

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "",
    response_model=PaginatedResponseModel[SettingResponse],
    status_code=status.HTTP_200_OK,
    summary="List Settings (Architecture Stub)",
)
async def list_settings():
    """Endpoint placeholder for settings."""
    return PaginatedResponseModel(
        success=True,
        message="Settings architecture endpoint ready",
        data=[],
    )
