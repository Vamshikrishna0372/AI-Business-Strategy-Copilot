"""Collection names constants and references accessor functions."""

from enum import Enum
from motor.motor_asyncio import AsyncIOMotorCollection
from app.database.connection import DatabaseManager


class CollectionName(str, Enum):
    """MongoDB Collection Name Constants."""
    USERS = "users"
    STARTUPS = "startups"
    AI_INTERVIEWS = "ai_interviews"
    AI_REPORTS = "ai_reports"
    CONVERSATIONS = "conversations"
    TASKS = "tasks"
    FILES = "files"
    NOTIFICATIONS = "notifications"
    ACTIVITY_LOGS = "activity_logs"
    SETTINGS = "settings"
    TAVILY_CACHE = "tavily_cache"


def get_collection(collection_name: CollectionName) -> AsyncIOMotorCollection:
    """Returns Motor Collection reference by collection name enum."""
    db = DatabaseManager.get_database()
    return db[collection_name.value]


# Collection accessor helper functions
def get_users_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.USERS)


def get_startups_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.STARTUPS)


def get_ai_interviews_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.AI_INTERVIEWS)


def get_ai_reports_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.AI_REPORTS)


def get_conversations_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.CONVERSATIONS)


def get_tasks_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.TASKS)


def get_files_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.FILES)


def get_notifications_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.NOTIFICATIONS)


def get_activity_logs_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.ACTIVITY_LOGS)


def get_settings_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.SETTINGS)


def get_tavily_cache_collection() -> AsyncIOMotorCollection:
    return get_collection(CollectionName.TAVILY_CACHE)
