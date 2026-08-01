"""Startup Workspace Schemas DTOs."""

from datetime import datetime
from typing import List, Optional
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema
from app.common.enums import StartupStage


class StartupCreate(BaseSchema):
    """Startup workspace creation payload."""

    name: str = Field(..., min_length=2, max_length=100, description="Startup name (required)")
    tagline: Optional[str] = Field(default=None, max_length=200, description="Tagline / pitch slogan")
    industry: Optional[str] = Field(default=None, max_length=100, description="Industry sector")
    stage: StartupStage = Field(default=StartupStage.IDEA, description="Lifecycle stage")
    country: Optional[str] = Field(default=None, max_length=100, description="Operating country")
    city: Optional[str] = Field(default=None, max_length=100, description="Operating city")
    problem_statement: Optional[str] = Field(default=None, description="Problem being solved")
    solution: Optional[str] = Field(default=None, description="Proposed solution")
    target_audience: Optional[str] = Field(default=None, description="Target customer audience")
    business_model: Optional[str] = Field(default=None, description="B2B, B2C, SaaS, etc.")
    revenue_model: Optional[str] = Field(default=None, description="Monetization model")
    website_url: Optional[str] = Field(default=None, description="Website URL")
    linkedin_url: Optional[str] = Field(default=None, description="LinkedIn company URL")
    logo_url: Optional[str] = Field(default=None, description="Logo image URL")
    description: Optional[str] = Field(default=None, description="Detailed startup summary")
    status: str = Field(default="active", description="Status: 'draft', 'active'")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Startup name cannot be empty or whitespace only.")
        return v


class StartupUpdate(BaseSchema):
    """Startup workspace update payload."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    tagline: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=100)
    stage: Optional[StartupStage] = Field(default=None)
    country: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    problem_statement: Optional[str] = Field(default=None)
    solution: Optional[str] = Field(default=None)
    target_audience: Optional[str] = Field(default=None)
    business_model: Optional[str] = Field(default=None)
    revenue_model: Optional[str] = Field(default=None)
    website_url: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)


class StartupResponse(BaseSchema):
    """Startup workspace response schema."""

    id: str = Field(..., description="Startup ID")
    name: str = Field(..., description="Startup name")
    slug: str = Field(..., description="URL slug")
    tagline: Optional[str] = Field(default=None)
    industry: Optional[str] = Field(default=None)
    stage: StartupStage = Field(...)
    country: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    problem_statement: Optional[str] = Field(default=None)
    solution: Optional[str] = Field(default=None)
    target_audience: Optional[str] = Field(default=None)
    business_model: Optional[str] = Field(default=None)
    revenue_model: Optional[str] = Field(default=None)
    website_url: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    status: str = Field(...)

    owner_id: str = Field(...)
    member_ids: List[str] = Field(default_factory=list)

    progress: int = Field(default=0)
    completion_percentage: int = Field(default=0)
    last_opened_at: Optional[datetime] = Field(default=None)
    current_step: str = Field(default="idea_validation")
    ai_score_placeholder: float = Field(default=0.0)
    investor_readiness_placeholder: float = Field(default=0.0)
    business_health_placeholder: float = Field(default=0.0)

    created_at: datetime
    updated_at: datetime
