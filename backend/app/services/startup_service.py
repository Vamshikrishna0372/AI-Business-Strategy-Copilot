"""Startup Workspace Domain Service Layer."""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from bson import ObjectId
from app.common.enums import ActivityAction
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.startup import Startup
from app.repositories.startup_repository import StartupRepository
from app.repositories.user_repository import UserRepository
from app.repositories.activity_log_repository import ActivityLogRepository
from app.schemas.startup import StartupCreate, StartupResponse, StartupUpdate
from app.services.base import BaseService
from app.utils.string import slugify, generate_random_token


class StartupService(BaseService[StartupRepository]):
    """Startup workspace business logic service layer."""

    def __init__(
        self,
        startup_repository: StartupRepository,
        user_repository: UserRepository,
        activity_log_repository: ActivityLogRepository,
    ):
        super().__init__(repository=startup_repository)
        self.user_repository = user_repository
        self.activity_log_repository = activity_log_repository

    def _calculate_progress(self, startup: Startup) -> int:
        """Calculates dynamic workspace setup completion percentage."""
        fields_to_check = [
            startup.name,
            startup.tagline,
            startup.industry,
            startup.stage,
            startup.country,
            startup.city,
            startup.problem_statement,
            startup.solution,
            startup.target_audience,
            startup.business_model,
            startup.revenue_model,
            startup.website_url,
            startup.description,
        ]
        completed = sum(1 for f in fields_to_check if f is not None and str(f).strip() != "")
        total = len(fields_to_check)
        return int((completed / total) * 100)

    def _to_response(self, startup: Startup) -> StartupResponse:
        """Converts Startup model to StartupResponse DTO."""
        return StartupResponse(
            id=str(startup.id),
            name=startup.name,
            slug=startup.slug,
            tagline=startup.tagline,
            industry=startup.industry,
            stage=startup.stage,
            country=startup.country,
            city=startup.city,
            problem_statement=startup.problem_statement,
            solution=startup.solution,
            target_audience=startup.target_audience,
            business_model=startup.business_model,
            revenue_model=startup.revenue_model,
            website_url=startup.website_url,
            linkedin_url=startup.linkedin_url,
            logo_url=startup.logo_url,
            description=startup.description,
            status=startup.status,
            owner_id=str(startup.owner_id),
            member_ids=[str(m) for m in startup.member_ids],
            progress=startup.progress,
            completion_percentage=startup.completion_percentage,
            last_opened_at=startup.last_opened_at,
            current_step=startup.current_step,
            ai_score_placeholder=startup.ai_score_placeholder,
            investor_readiness_placeholder=startup.investor_readiness_placeholder,
            business_health_placeholder=startup.business_health_placeholder,
            created_at=startup.created_at,
            updated_at=startup.updated_at,
        )

    async def create_startup(
        self, user_id_str: str, payload: StartupCreate, ip_address: Optional[str] = None
    ) -> StartupResponse:
        """Creates a new startup workspace for founder, ensuring name uniqueness and isolation."""
        # 1. Prevent duplicate startup names for the same founder
        existing = await self.repository.get_by_owner_and_name(user_id_str, payload.name)
        if existing:
            raise BadRequestException(f"You already have a startup named '{payload.name}'. Please choose a unique name.")

        # 2. Generate unique slug
        base_slug = slugify(payload.name) or "startup"
        slug = base_slug
        slug_existing = await self.repository.get_by_slug(slug)
        if slug_existing:
            slug = f"{base_slug}-{generate_random_token(6).lower()}"

        owner_obj_id = ObjectId(user_id_str)
        startup_model = Startup(
            name=payload.name,
            slug=slug,
            tagline=payload.tagline,
            industry=payload.industry,
            stage=payload.stage,
            country=payload.country,
            city=payload.city,
            problem_statement=payload.problem_statement,
            solution=payload.solution,
            target_audience=payload.target_audience,
            business_model=payload.business_model,
            revenue_model=payload.revenue_model,
            website_url=payload.website_url,
            linkedin_url=payload.linkedin_url,
            logo_url=payload.logo_url,
            description=payload.description,
            status=payload.status,
            owner_id=owner_obj_id,
            member_ids=[owner_obj_id],
        )

        progress = self._calculate_progress(startup_model)
        startup_model.progress = progress
        startup_model.completion_percentage = progress
        startup_model.last_opened_at = datetime.now(timezone.utc)

        created_startup = await self.repository.create(startup_model)
        startup_id_str = str(created_startup.id)

        # Update user active startup if none is active
        user = await self.user_repository.get_by_id(user_id_str)
        if user and not user.preferences.get("active_startup_id"):
            await self.user_repository.update_preferences(user_id_str, {"active_startup_id": startup_id_str})

        # Activity log
        await self.activity_log_repository.log_activity(
            action=ActivityAction.CREATE,
            entity_type="startup",
            entity_id=startup_id_str,
            user_id_str=user_id_str,
            startup_id_str=startup_id_str,
            description=f"Created startup workspace '{created_startup.name}'",
            ip_address=ip_address,
        )

        return self._to_response(created_startup)

    async def get_user_startups(
        self,
        user_id_str: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
        stage: Optional[str] = None,
        industry: Optional[str] = None,
        sort_by: str = "updated_at",
        sort_order: int = -1,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[StartupResponse], int]:
        """Retrieves list of user's startup workspaces with search/filter/sort/pagination."""
        skip = (page - 1) * page_size
        items, total = await self.repository.find_startups_with_query(
            owner_id_str=user_id_str,
            search=search,
            status=status,
            stage=stage,
            industry=industry,
            sort_by=sort_by,
            sort_order=sort_order,
            skip=skip,
            limit=page_size,
        )
        return [self._to_response(s) for s in items], total

    async def get_startup_by_id(self, user_id_str: str, startup_id_str: str) -> StartupResponse:
        """Gets startup by ID, enforcing strict workspace owner access."""
        startup = await self.repository.get_by_owner_and_id(user_id_str, startup_id_str)
        if not startup:
            raise NotFoundException("Startup workspace not found or access denied")

        # Update last opened timestamp
        await self.repository.update(startup_id_str, {"last_opened_at": datetime.now(timezone.utc)})
        startup.last_opened_at = datetime.now(timezone.utc)
        return self._to_response(startup)

    async def update_startup(
        self, user_id_str: str, startup_id_str: str, payload: StartupUpdate, ip_address: Optional[str] = None
    ) -> StartupResponse:
        """Updates startup workspace fields."""
        startup = await self.repository.get_by_owner_and_id(user_id_str, startup_id_str)
        if not startup:
            raise NotFoundException("Startup workspace not found or access denied")

        update_dict = payload.model_dump(exclude_unset=True)

        # Check duplicate name if name is updated
        if "name" in update_dict and update_dict["name"].strip().lower() != startup.name.lower():
            existing = await self.repository.get_by_owner_and_name(user_id_str, update_dict["name"])
            if existing and str(existing.id) != startup_id_str:
                raise BadRequestException(f"You already have a startup named '{update_dict['name']}'.")
            update_dict["slug"] = slugify(update_dict["name"])

        # Update dict and recalculate progress
        updated_startup = await self.repository.update(startup_id_str, update_dict)
        if not updated_startup:
            raise NotFoundException("Failed to update startup workspace")

        new_progress = self._calculate_progress(updated_startup)
        if new_progress != updated_startup.progress:
            updated_startup = await self.repository.update(
                startup_id_str, {"progress": new_progress, "completion_percentage": new_progress}
            ) or updated_startup

        await self.activity_log_repository.log_activity(
            action=ActivityAction.UPDATE,
            entity_type="startup",
            entity_id=startup_id_str,
            user_id_str=user_id_str,
            startup_id_str=startup_id_str,
            description=f"Updated startup workspace '{updated_startup.name}'",
            ip_address=ip_address,
        )

        return self._to_response(updated_startup)

    async def delete_startup(
        self, user_id_str: str, startup_id_str: str, ip_address: Optional[str] = None
    ) -> bool:
        """Deletes startup workspace."""
        startup = await self.repository.get_by_owner_and_id(user_id_str, startup_id_str)
        if not startup:
            raise NotFoundException("Startup workspace not found or access denied")

        success = await self.repository.delete(startup_id_str)
        if success:
            # Clear user active startup preference if this startup was active
            user = await self.user_repository.get_by_id(user_id_str)
            if user and user.preferences.get("active_startup_id") == startup_id_str:
                await self.user_repository.update_preferences(user_id_str, {"active_startup_id": None})

            await self.activity_log_repository.log_activity(
                action=ActivityAction.DELETE,
                entity_type="startup",
                entity_id=startup_id_str,
                user_id_str=user_id_str,
                startup_id_str=startup_id_str,
                description=f"Deleted startup workspace '{startup.name}'",
                ip_address=ip_address,
            )

        return success

    async def archive_startup(
        self, user_id_str: str, startup_id_str: str, ip_address: Optional[str] = None
    ) -> StartupResponse:
        """Archives a startup workspace."""
        update_dto = StartupUpdate(status="archived")
        res = await self.update_startup(user_id_str, startup_id_str, update_dto, ip_address)
        await self.activity_log_repository.log_activity(
            action=ActivityAction.UPDATE,
            entity_type="startup",
            entity_id=startup_id_str,
            user_id_str=user_id_str,
            startup_id_str=startup_id_str,
            description=f"Archived startup workspace '{res.name}'",
            ip_address=ip_address,
        )
        return res

    async def restore_startup(
        self, user_id_str: str, startup_id_str: str, ip_address: Optional[str] = None
    ) -> StartupResponse:
        """Restores an archived startup workspace to active status."""
        update_dto = StartupUpdate(status="active")
        res = await self.update_startup(user_id_str, startup_id_str, update_dto, ip_address)
        await self.activity_log_repository.log_activity(
            action=ActivityAction.UPDATE,
            entity_type="startup",
            entity_id=startup_id_str,
            user_id_str=user_id_str,
            startup_id_str=startup_id_str,
            description=f"Restored startup workspace '{res.name}'",
            ip_address=ip_address,
        )
        return res

    async def activate_startup(
        self, user_id_str: str, startup_id_str: str, ip_address: Optional[str] = None
    ) -> StartupResponse:
        """Sets target startup workspace as the current active workspace for the founder."""
        startup = await self.get_startup_by_id(user_id_str, startup_id_str)
        await self.user_repository.update_preferences(user_id_str, {"active_startup_id": startup_id_str})

        await self.activity_log_repository.log_activity(
            action=ActivityAction.UPDATE,
            entity_type="startup",
            entity_id=startup_id_str,
            user_id_str=user_id_str,
            startup_id_str=startup_id_str,
            description=f"Activated workspace '{startup.name}' as current active context",
            ip_address=ip_address,
        )

        return startup
