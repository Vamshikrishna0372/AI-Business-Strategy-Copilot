"""Database Seed Initialization Script for Admin Account."""

from app.common.enums import UserRole
from app.core.logging import logger
from app.core.security import hash_password
from app.database.collections import CollectionName
from app.models.user import User
from app.repositories.user_repository import UserRepository

ADMIN_EMAIL = "admin@aibusinesscopilot.com"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME = "System Administrator"


async def seed_admin_user() -> User:
    """Idempotently seeds or updates the primary system administrator account."""
    user_repo = UserRepository(collection_name=CollectionName.USERS.value)
    existing_admin = await user_repo.get_by_email(ADMIN_EMAIL)

    hashed_pw = hash_password(ADMIN_PASSWORD)

    if existing_admin:
        updated = await user_repo.update(
            str(existing_admin.id),
            {
                "full_name": ADMIN_NAME,
                "hashed_password": hashed_pw,
                "role": UserRole.ADMIN,
                "is_active": True,
                "is_verified": True,
            },
        )
        logger.info(f"Updated existing admin account: {ADMIN_EMAIL}")
        return updated or existing_admin
    else:
        new_admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            hashed_password=hashed_pw,
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        created_admin = await user_repo.create(new_admin)
        logger.info(f"Seeded new admin account: {ADMIN_EMAIL}")
        return created_admin
