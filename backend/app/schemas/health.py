"""Health Check API response schema."""

from typing import Dict
from pydantic import Field
from app.schemas.base import BaseSchema


class HealthCheckResponse(BaseSchema):
    """Health check payload schema."""

    status: str = Field(default="ok", description="Overall health status")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Active environment")
    database: str = Field(..., description="Database connection health")
    services: Dict[str, str] = Field(default_factory=dict, description="Services readiness status")
