"""Startups Workspace API Endpoint Router."""

from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from app.common.responses import PaginatedResponseModel, PaginationMetadata, ResponseModel
from app.dependencies.auth import get_current_user
from app.dependencies.db import (
    get_activity_log_repository,
    get_startup_repository,
    get_user_repository,
)
from app.models.user import User
from app.repositories.activity_log_repository import ActivityLogRepository
from app.repositories.startup_repository import StartupRepository
from app.repositories.user_repository import UserRepository
from app.schemas.startup import StartupCreate, StartupResponse, StartupUpdate
from app.services.startup_service import StartupService

router = APIRouter(prefix="/startups", tags=["Startup Workspaces"])


def get_startup_service(
    startup_repo: StartupRepository = Depends(get_startup_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    activity_repo: ActivityLogRepository = Depends(get_activity_log_repository),
) -> StartupService:
    return StartupService(
        startup_repository=startup_repo,
        user_repository=user_repo,
        activity_log_repository=activity_repo,
    )


@router.post(
    "",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Startup Workspace",
    description="Creates a new startup workspace for the authenticated founder.",
)
async def create_startup(
    payload: StartupCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    data = await service.create_startup(str(current_user.id), payload, ip_address=ip)
    return ResponseModel(success=True, message="Startup workspace created successfully", data=data)


@router.get(
    "",
    response_model=PaginatedResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="List Startup Workspaces",
    description="Returns all startup workspaces for the authenticated founder with search, filter, sort and pagination.",
)
async def list_startups(
    search: Optional[str] = Query(default=None, description="Search by name, tagline, or description"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status: active, draft, archived"),
    stage: Optional[str] = Query(default=None, description="Filter by stage: idea, pre_seed, seed, series_a, growth"),
    industry: Optional[str] = Query(default=None, description="Filter by industry keyword"),
    sort_by: str = Query(default="updated_at", description="Sort field: updated_at, created_at, name, progress"),
    sort_order: Literal["asc", "desc"] = Query(default="desc", description="Sort direction"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    order_int = -1 if sort_order == "desc" else 1
    items, total = await service.get_user_startups(
        user_id_str=str(current_user.id),
        search=search,
        status=status_filter,
        stage=stage,
        industry=industry,
        sort_by=sort_by,
        sort_order=order_int,
        page=page,
        page_size=page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponseModel(
        success=True,
        message="Startup workspaces retrieved successfully",
        data=items,
        meta=PaginationMetadata(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
    )


@router.get(
    "/{startup_id}",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Startup Workspace by ID",
    description="Returns a single startup workspace by ID. Access enforces workspace isolation.",
)
async def get_startup(
    startup_id: str,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    data = await service.get_startup_by_id(str(current_user.id), startup_id)
    return ResponseModel(success=True, message="Startup workspace retrieved", data=data)


@router.put(
    "/{startup_id}",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="Update Startup Workspace",
    description="Updates fields on an existing startup workspace.",
)
async def update_startup(
    startup_id: str,
    payload: StartupUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    data = await service.update_startup(str(current_user.id), startup_id, payload, ip_address=ip)
    return ResponseModel(success=True, message="Startup workspace updated successfully", data=data)


@router.delete(
    "/{startup_id}",
    response_model=ResponseModel[dict],
    status_code=status.HTTP_200_OK,
    summary="Delete Startup Workspace",
    description="Permanently deletes a startup workspace.",
)
async def delete_startup(
    startup_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    await service.delete_startup(str(current_user.id), startup_id, ip_address=ip)
    return ResponseModel(
        success=True,
        message="Startup workspace deleted successfully",
        data={"startup_id": startup_id},
    )


@router.patch(
    "/{startup_id}/archive",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="Archive Startup Workspace",
    description="Archives a startup workspace. Can be restored later.",
)
async def archive_startup(
    startup_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    data = await service.archive_startup(str(current_user.id), startup_id, ip_address=ip)
    return ResponseModel(success=True, message="Startup workspace archived", data=data)


@router.patch(
    "/{startup_id}/restore",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="Restore Archived Startup Workspace",
    description="Restores a previously archived startup workspace to active status.",
)
async def restore_startup(
    startup_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    data = await service.restore_startup(str(current_user.id), startup_id, ip_address=ip)
    return ResponseModel(success=True, message="Startup workspace restored to active", data=data)


@router.patch(
    "/{startup_id}/activate",
    response_model=ResponseModel[StartupResponse],
    status_code=status.HTTP_200_OK,
    summary="Activate Startup Workspace Context",
    description="Sets this startup workspace as the founder's currently active workspace context.",
)
async def activate_startup(
    startup_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: StartupService = Depends(get_startup_service),
):
    ip = request.client.host if request.client else None
    data = await service.activate_startup(str(current_user.id), startup_id, ip_address=ip)
    return ResponseModel(success=True, message="Startup workspace activated as current context", data=data)
