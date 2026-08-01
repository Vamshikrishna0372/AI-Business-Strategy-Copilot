"""Startup collection repository with dual ObjectId and string ID query matching."""

import re
from typing import Dict, List, Optional, Tuple, Any
from bson import ObjectId
from app.database.collections import CollectionName
from app.models.startup import Startup
from app.repositories.base import BaseRepository


class StartupRepository(BaseRepository[Startup]):
    """Startup database repository."""

    def __init__(self, collection_name: str = CollectionName.STARTUPS.value):
        super().__init__(collection_name=collection_name, model_class=Startup)

    async def get_by_slug(self, slug: str) -> Optional[Startup]:
        """Finds startup by unique URL slug."""
        return await self.find_one({"slug": slug.lower().strip()})

    async def get_by_owner_and_name(self, owner_id_str: str, name: str) -> Optional[Startup]:
        """Finds startup owned by user with exact matching name (case-insensitive)."""
        if not ObjectId.is_valid(owner_id_str):
            return None
        owner_obj_id = ObjectId(owner_id_str)
        regex_name = re.compile(f"^{re.escape(name.strip())}$", re.IGNORECASE)
        return await self.find_one({
            "name": regex_name,
            "$or": [
                {"owner_id": owner_obj_id},
                {"owner_id": owner_id_str},
                {"member_ids": owner_obj_id},
                {"member_ids": owner_id_str},
            ],
        })

    async def get_by_owner_and_id(self, owner_id_str: str, startup_id_str: str) -> Optional[Startup]:
        """Finds startup owned by or accessible to user by ObjectId string."""
        if not ObjectId.is_valid(owner_id_str) or not ObjectId.is_valid(startup_id_str):
            return None
        owner_obj_id = ObjectId(owner_id_str)
        startup_obj_id = ObjectId(startup_id_str)
        return await self.find_one({
            "_id": startup_obj_id,
            "$or": [
                {"owner_id": owner_obj_id},
                {"owner_id": owner_id_str},
                {"member_ids": owner_obj_id},
                {"member_ids": owner_id_str},
            ],
        })

    async def find_startups_with_query(
        self,
        owner_id_str: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
        stage: Optional[str] = None,
        industry: Optional[str] = None,
        sort_by: str = "updated_at",
        sort_order: int = -1,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Startup], int]:
        """Finds startups for user with search, filter, sorting, and pagination."""
        if not ObjectId.is_valid(owner_id_str):
            return [], 0

        owner_obj_id = ObjectId(owner_id_str)

        # Allow both ObjectId and string matches for owner_id/member_ids
        filter_dict: Dict[str, Any] = {
            "$or": [
                {"owner_id": owner_obj_id},
                {"owner_id": owner_id_str},
                {"member_ids": owner_obj_id},
                {"member_ids": owner_id_str},
            ]
        }

        if status:
            filter_dict["status"] = status

        if stage:
            filter_dict["stage"] = stage

        if industry:
            filter_dict["industry"] = re.compile(re.escape(industry), re.IGNORECASE)

        if search and search.strip():
            search_regex = re.compile(re.escape(search.strip()), re.IGNORECASE)
            filter_dict["$and"] = [
                {
                    "$or": [
                        {"name": search_regex},
                        {"tagline": search_regex},
                        {"industry": search_regex},
                        {"description": search_regex},
                    ]
                }
            ]

        valid_sort_fields = {"created_at", "updated_at", "name", "progress", "stage", "status"}
        if sort_by not in valid_sort_fields:
            sort_by = "updated_at"

        total_count = await self.count(filter_dict)
        items = await self.find_many(
            filter_dict=filter_dict,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        return items, total_count
