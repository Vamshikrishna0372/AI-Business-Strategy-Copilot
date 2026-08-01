"""Database collection and repository dependency injection providers."""

from app.database.collections import CollectionName
from app.repositories.user_repository import UserRepository
from app.repositories.startup_repository import StartupRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.activity_log_repository import ActivityLogRepository


def get_user_repository() -> UserRepository:
    """Dependency provider for UserRepository."""
    return UserRepository(collection_name=CollectionName.USERS.value)


def get_startup_repository() -> StartupRepository:
    """Dependency provider for StartupRepository."""
    return StartupRepository(collection_name=CollectionName.STARTUPS.value)


def get_interview_repository() -> InterviewRepository:
    """Dependency provider for InterviewRepository."""
    return InterviewRepository(collection_name=CollectionName.AI_INTERVIEWS.value)


def get_activity_log_repository() -> ActivityLogRepository:
    """Dependency provider for ActivityLogRepository."""
    return ActivityLogRepository(collection_name=CollectionName.ACTIVITY_LOGS.value)
