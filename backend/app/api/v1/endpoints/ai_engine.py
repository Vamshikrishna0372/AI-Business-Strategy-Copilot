"""AI Engine Direct Generation & Health Status API Endpoints."""

from fastapi import APIRouter, Depends, status
from app.ai.fallback import FallbackAIProvider
from app.common.responses import ResponseModel
from app.core.config import settings
from app.dependencies.auth import get_current_active_startup, get_current_user
from app.middleware.rate_limiter import ai_rate_limiter
from app.models.startup import Startup
from app.models.user import User
from app.schemas.ai import AIGenerateRequest, AIGenerateResponse, AIHealthResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Engine"])
ai_service = AIService()


@router.post(
    "/generate",
    response_model=ResponseModel[AIGenerateResponse],
    status_code=status.HTTP_200_OK,
    summary="Execute AI Module Strategy Generation",
)
async def generate_ai_analysis(
    body: AIGenerateRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Directly executes AI strategy module generation with isolated startup context."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))

    result = await ai_service.generate_module_analysis(
        user=current_user,
        startup=current_startup,
        module=body.module,
        prompt=body.prompt,
    )
    return ResponseModel(
        success=True,
        message=f"AI {body.module} analysis generated successfully",
        data=result,
    )


@router.get(
    "/health",
    response_model=ResponseModel[AIHealthResponse],
    status_code=status.HTTP_200_OK,
    summary="Check AI Provider Engine Status",
)
async def get_ai_health(
    current_user: User = Depends(get_current_user),
):
    """Returns AI Provider status and readiness."""
    fallback_provider = FallbackAIProvider()
    is_healthy = await fallback_provider.health_check()

    health_info = AIHealthResponse(
        status="healthy" if is_healthy else "degraded",
        primary_provider=settings.DEFAULT_AI_PROVIDER,
        fallback_provider=settings.FALLBACK_AI_PROVIDER,
        healthy=is_healthy,
    )
    return ResponseModel(
        success=True,
        message="AI engine health check completed",
        data=health_info,
    )
