"""Production-Grade Health Check & System Readiness Endpoints."""

import time
from typing import Any, Dict
from fastapi import APIRouter, Depends, status

from app.ai.factory import AIProviderFactory
from app.common.responses import ResponseModel
from app.core.config import Settings, settings
from app.database.connection import DatabaseManager, db_manager
from app.dependencies.config import get_app_settings
from app.schemas.health import HealthCheckResponse

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])

START_TIME = time.time()


@router.get(
    "",
    response_model=ResponseModel[HealthCheckResponse],
    status_code=status.HTTP_200_OK,
    summary="Application Overall Health Check",
    description="Returns current operational status of server, database, authentication, and AI providers.",
)
async def check_health(app_settings: Settings = Depends(get_app_settings)):
    """Primary health check endpoint handler."""
    db_healthy = await DatabaseManager.ping_health()
    db_status = "connected" if db_healthy else "disconnected"

    uptime_seconds = round(time.time() - START_TIME, 2)

    health_data = HealthCheckResponse(
        status="ok" if db_healthy else "degraded",
        app_name=app_settings.APP_NAME,
        version=app_settings.APP_VERSION,
        environment=app_settings.ENVIRONMENT.value,
        database=db_status,
        services={
            "uptime_seconds": str(uptime_seconds),
            "jwt_auth": "ready",
            "google_oauth": "ready" if app_settings.GOOGLE_CLIENT_ID else "not_configured",
            "gemini_ai": "ready" if app_settings.GEMINI_API_KEY else "not_configured",
            "groq_ai": "ready" if app_settings.GROQ_API_KEY else "not_configured",
        },
    )

    return ResponseModel(
        success=db_healthy,
        message="Health check completed",
        data=health_data,
    )


@router.get(
    "/database",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="MongoDB Database Readiness & Ping",
)
async def check_database_health():
    """Detailed database connection and ping latency check."""
    start = time.time()
    db_healthy = await DatabaseManager.ping_health()
    latency_ms = round((time.time() - start) * 1000, 2)

    return ResponseModel(
        success=db_healthy,
        message="Database ping completed",
        data={
            "database_name": settings.DATABASE_NAME,
            "connected": db_healthy,
            "latency_ms": latency_ms,
            "status": "healthy" if db_healthy else "unhealthy",
        },
    )


@router.get(
    "/ai",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="AI Provider Readiness & Ping",
)
async def check_ai_health():
    """Pings configured AI providers (Gemini primary, Groq fallback) and returns status."""
    primary_name = settings.DEFAULT_AI_PROVIDER
    fallback_name = settings.FALLBACK_AI_PROVIDER

    primary_provider = AIProviderFactory.get_provider(primary_name)
    fallback_provider = AIProviderFactory.get_provider(fallback_name)

    start_p = time.time()
    primary_ok = await primary_provider.health_check()
    p_latency = round((time.time() - start_p) * 1000, 2)

    start_f = time.time()
    fallback_ok = await fallback_provider.health_check()
    f_latency = round((time.time() - start_f) * 1000, 2)

    overall_ai = primary_ok or fallback_ok

    return ResponseModel(
        success=overall_ai,
        message="AI Health check completed",
        data={
            "overall_status": "healthy" if overall_ai else "degraded",
            "primary": {
                "provider": primary_name,
                "model": settings.DEFAULT_AI_MODEL,
                "healthy": primary_ok,
                "latency_ms": p_latency,
            },
            "fallback": {
                "provider": fallback_name,
                "model": settings.FALLBACK_AI_MODEL,
                "healthy": fallback_ok,
                "latency_ms": f_latency,
            },
        },
    )


@router.get(
    "/system",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="System Operational Metrics",
)
async def check_system_metrics():
    """Returns uptime, environment configuration, and server process readiness status."""
    uptime = round(time.time() - START_TIME, 2)
    return ResponseModel(
        success=True,
        message="System readiness check completed",
        data={
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT.value,
            "debug": settings.DEBUG,
            "uptime_seconds": uptime,
            "timezone": settings.TIMEZONE,
            "max_tokens": settings.AI_MAX_TOKENS,
            "rate_limit_rpm": settings.AI_RATE_LIMIT_PER_MINUTE,
        },
    )
