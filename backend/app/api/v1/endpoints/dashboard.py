"""Dashboard Overview & Business Scoring API Endpoints."""

from fastapi import APIRouter, Depends, status

from app.common.responses import ResponseModel
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_active_startup, get_current_user
from app.models.startup import Startup
from app.models.user import User
from app.schemas.dashboard_schema import DashboardOverviewResponse, StartupScoresResponse
from app.services.ai_service import AIService

router = APIRouter(tags=["Dashboard & Business Scoring"])
ai_service = AIService()


@router.get(
    "/dashboard",
    response_model=ResponseModel[DashboardOverviewResponse],
    status_code=status.HTTP_200_OK,
    summary="Executive AI Dashboard Overview",
)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns aggregated executive dashboard: scores, latest reports, AI recommendations, and activity timeline."""
    overview = await ai_service.get_dashboard_overview(user=current_user, startup=current_startup)
    return ResponseModel(
        success=True,
        message="Executive dashboard retrieved successfully",
        data=overview,
    )


@router.get(
    "/startup/{startupId}/scores",
    response_model=ResponseModel[StartupScoresResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Business Scoring Engine Metrics",
)
async def get_startup_scores(
    startupId: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns multi-dimensional business health scores for a startup workspace."""
    if str(current_startup.id) != startupId:
        raise NotFoundException(f"Startup '{startupId}' not found or access denied")
    scores = await ai_service.calculate_startup_scores(startupId)
    return ResponseModel(
        success=True,
        message="Business scores calculated successfully",
        data=scores,
    )


@router.get(
    "/startup/{startupId}/timeline",
    response_model=ResponseModel[list],
    status_code=status.HTTP_200_OK,
    summary="Get Startup Activity Timeline",
)
async def get_startup_timeline(
    startupId: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Returns chronological activity log timeline for the startup workspace."""
    from bson import ObjectId
    from app.database.collections import CollectionName, get_collection

    if str(current_startup.id) != startupId:
        raise NotFoundException(f"Startup '{startupId}' not found or access denied")

    col = get_collection(CollectionName.ACTIVITY_LOGS)
    cursor = col.find({"startup_id": ObjectId(startupId)}).sort("created_at", -1).limit(50)
    docs = await cursor.to_list(length=50)
    timeline = [
        {
            "id": str(d.get("_id", "")),
            "action": d.get("action", ""),
            "entity_type": d.get("entity_type", ""),
            "description": d.get("description", ""),
            "timestamp": d.get("created_at"),
        }
        for d in docs
    ]
    return ResponseModel(
        success=True,
        message="Activity timeline retrieved successfully",
        data=timeline,
    )
