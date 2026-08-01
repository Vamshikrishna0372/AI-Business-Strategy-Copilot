"""Dashboard Overview and Business Scoring Schemas and DTOs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.schemas.base import BaseSchema


class ScoreMetricSchema(BaseSchema):
    """Detailed score item with value, confidence, reason, and recommendation."""
    value: float = Field(..., ge=0.0, le=100.0)
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    reason: str
    recommendation: str


class StartupScoresResponse(BaseSchema):
    """Multi-dimensional business scoring breakdown response."""
    startup_id: str
    overall_startup_score: ScoreMetricSchema
    business_health: ScoreMetricSchema
    innovation_score: ScoreMetricSchema
    investor_readiness: ScoreMetricSchema
    market_opportunity: ScoreMetricSchema
    financial_health: ScoreMetricSchema
    growth_potential: ScoreMetricSchema
    execution_progress: ScoreMetricSchema
    risk_level: ScoreMetricSchema


class ActivityTimelineItemSchema(BaseSchema):
    """Activity log timeline item response."""
    id: str
    action: str
    entity_type: str
    description: str
    timestamp: datetime


class AIRecommendationSchema(BaseSchema):
    """Actionable AI Recommendation item."""
    title: str
    business_area: str
    priority: str = "High"  # High, Medium, Low
    expected_impact: str
    difficulty: str = "Medium"
    estimated_time: str


class DashboardOverviewResponse(BaseSchema):
    """Executive Dashboard aggregated overview response schema."""
    startup_id: str
    startup_name: str
    stage: str
    progress: int
    completion_percentage: int
    scores: StartupScoresResponse
    latest_reports: List[Dict[str, Any]] = Field(default_factory=list)
    ai_recommendations: List[AIRecommendationSchema] = Field(default_factory=list)
    recent_activity: List[ActivityTimelineItemSchema] = Field(default_factory=list)
