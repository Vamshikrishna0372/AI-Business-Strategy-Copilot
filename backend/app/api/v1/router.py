"""API v1 Central Router aggregator."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    ai_engine,
    auth,
    chat,
    dashboard,
    health,
    interviews,
    modules,
    notifications,
    reports,
    settings,
    startups,
    users,
)

api_v1_router = APIRouter(prefix="/api/v1")

# Core infrastructure routers
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(startups.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(settings.router)

# AI Engine & Chat
api_v1_router.include_router(ai_engine.router)
api_v1_router.include_router(chat.router)

# AI Business Strategy Modules (1-9)
api_v1_router.include_router(modules.router)

# Report Management & Versioning
api_v1_router.include_router(reports.router)

# Legacy interview stub (now superseded by modules.py)
api_v1_router.include_router(interviews.router)

# Dashboard & Business Scoring
api_v1_router.include_router(dashboard.router)
