"""Report Management API Endpoints with versioned history."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.common.responses import PaginatedResponseModel, ResponseModel
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_active_startup, get_current_user
from app.models.startup import Startup
from app.models.user import User
from app.schemas.reports_schema import RegenerateReportRequest, ReportResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/reports", tags=["Report Management & Versioning"])
ai_service = AIService()


def _map_report(report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        startup_id=str(report.startup_id),
        user_id=str(report.user_id),
        report_type=report.report_type.value if hasattr(report.report_type, "value") else str(report.report_type),
        title=report.title,
        version=report.version,
        status=report.status,
        ai_provider=report.ai_provider,
        confidence=report.confidence,
        content=report.content,
        conversation_id=str(report.conversation_id) if report.conversation_id else None,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get(
    "",
    response_model=PaginatedResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List All Reports for Active Startup",
)
async def list_reports(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns all versioned strategy reports for the active startup workspace."""
    reports = await ai_service.list_reports(str(current_startup.id), skip=skip, limit=limit)
    total = await ai_service.report_repo.count_reports_by_startup(str(current_startup.id))
    return PaginatedResponseModel(
        success=True,
        message="Reports retrieved successfully",
        data=[_map_report(r) for r in reports],
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1,
            "has_next": (skip + limit) < total,
            "has_prev": skip > 0,
        }
    )


@router.get(
    "/history",
    response_model=ResponseModel[List[ReportResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get Version History for a Report Type",
)
async def get_report_version_history(
    report_type: str = Query(..., description="Report type key e.g. 'business_strategy'"),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns all versions (v1, v2, v3...) of a specific report type for the active startup."""
    history = await ai_service.get_report_history(str(current_startup.id), report_type)
    return ResponseModel(
        success=True,
        message=f"Report history retrieved for '{report_type}'",
        data=[_map_report(r) for r in history],
    )


@router.get(
    "/latest",
    response_model=ResponseModel[Optional[ReportResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get Latest Version of a Specific Report Type",
)
async def get_latest_report(
    report_type: str = Query(..., description="Report type key e.g. 'business_strategy'"),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns the latest generated version of a specific report type for the active startup."""
    history = await ai_service.get_report_history(str(current_startup.id), report_type)
    if not history:
        return ResponseModel(success=True, message=f"No report found for '{report_type}'", data=None)
    latest = history[0]  # Already sorted by version desc
    return ResponseModel(success=True, message=f"Latest report retrieved for '{report_type}'", data=_map_report(latest))


@router.get(
    "/{reportId}",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Report by ID",
)
async def get_report(
    reportId: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Retrieves a specific report ensuring startup workspace ownership isolation."""
    report = await ai_service.get_report(str(current_startup.id), reportId)
    if not report:
        raise NotFoundException(f"Report '{reportId}' not found in active startup workspace")
    return ResponseModel(success=True, message="Report retrieved successfully", data=_map_report(report))


@router.post(
    "/regenerate",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Regenerate Report (Creates New Version)",
)
async def regenerate_report(
    body: RegenerateReportRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Regenerates a strategy report creating a new incremented version (v1 → v2 → v3).
    Previous versions are preserved for comparison."""
    report = await ai_service.regenerate_report(
        user=current_user,
        startup=current_startup,
        report_type_str=body.report_type,
        custom_instructions=body.custom_instructions,
    )
    return ResponseModel(
        success=True,
        message=f"Report regenerated successfully (Version {report.version})",
        data=_map_report(report),
    )
