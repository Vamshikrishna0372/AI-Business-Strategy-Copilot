"""Startup Workspace MongoDB Model."""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.enums import StartupStage
from app.common.types import PyObjectId


class Startup(MongoBaseModel):
    """Startup Workspace collection model."""

    name: str = Field(..., description="Startup business name")
    slug: str = Field(..., description="Unique URL slug identifier")
    tagline: Optional[str] = Field(default=None, description="Short slogan or tagline")
    industry: Optional[str] = Field(default=None, description="Industry sector (e.g. FinTech, HealthTech, AI)")
    stage: StartupStage = Field(default=StartupStage.IDEA, description="Startup lifecycle stage")
    country: Optional[str] = Field(default=None, description="Operating country")
    city: Optional[str] = Field(default=None, description="Operating city")
    problem_statement: Optional[str] = Field(default=None, description="Problem being solved")
    solution: Optional[str] = Field(default=None, description="Proposed business solution")
    target_audience: Optional[str] = Field(default=None, description="Target customer segment")
    business_model: Optional[str] = Field(default=None, description="B2B, B2C, Marketplace, SaaS, etc.")
    revenue_model: Optional[str] = Field(default=None, description="Subscription, Transaction Fee, Freemium, etc.")
    website_url: Optional[str] = Field(default=None, description="Company website URL")
    linkedin_url: Optional[str] = Field(default=None, description="Company LinkedIn profile URL")
    logo_url: Optional[str] = Field(default=None, description="Company logo image URL")
    description: Optional[str] = Field(default=None, description="Detailed startup summary")
    status: str = Field(default="active", description="Workspace status: 'draft', 'active', 'archived'")

    owner_id: PyObjectId = Field(..., description="User ID of workspace founder/owner")
    member_ids: List[PyObjectId] = Field(default_factory=list, description="Team member User IDs")

    # Workspace Metadata & Placeholders
    progress: int = Field(default=0, ge=0, le=100, description="Setup completion percentage (0-100)")
    completion_percentage: int = Field(default=0, ge=0, le=100, description="Strategy workspace completeness")
    last_opened_at: Optional[datetime] = Field(default=None, description="Timestamp when founder last accessed")
    current_step: str = Field(default="idea_validation", description="Active step in strategy copilot")
    ai_score_placeholder: float = Field(default=0.0, description="AI Business Feasibility Score placeholder (0-100)")
    investor_readiness_placeholder: float = Field(default=0.0, description="Investor Readiness Score placeholder (0-100)")
    business_health_placeholder: float = Field(default=0.0, description="Business Health Metric placeholder (0-100)")
