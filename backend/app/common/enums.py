"""System-wide Enumerations for AI Business Strategy Copilot."""

from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class UserRole(str, Enum):
    ADMIN = "admin"
    FOUNDER = "founder"
    INVESTOR = "investor"
    ADVISOR = "advisor"
    MEMBER = "member"


class StartupStage(str, Enum):
    IDEA = "idea"
    PRE_SEED = "pre_seed"
    SEED = "seed"
    SERIES_A = "series_a"
    GROWTH = "growth"


class InterviewStatus(str, Enum):
    NOT_STARTED = "not_started"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    STOPPED = "stopped"
    RESUMED = "resumed"
    COMPLETED = "completed"
    KNOWLEDGE_GENERATED = "knowledge_generated"
    ALL_MODULES_UPDATED = "all_modules_updated"


class ReportType(str, Enum):
    INTERVIEW_SUMMARY = "interview_summary"
    IDEA_VALIDATION = "idea_validation"
    BUSINESS_STRATEGY = "business_strategy"
    COMPETITOR_ANALYSIS = "competitor_analysis"
    BUSINESS_MODEL_CANVAS = "business_model_canvas"
    FINANCIAL_PLAN = "financial_planning"
    RISK_ASSESSMENT = "risk_analysis"
    INVESTOR_READINESS = "investor_readiness"
    EXECUTION_ROADMAP = "execution_roadmap"
    FULL_DECK = "full_deck"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationType(str, Enum):
    SYSTEM = "system"
    AI_COMPLETED = "ai_completed"
    WORKSPACE_INVITE = "workspace_invite"
    ALERT = "alert"


class ActivityAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    AI_GENERATE = "ai_generate"
    LOGIN = "login"
