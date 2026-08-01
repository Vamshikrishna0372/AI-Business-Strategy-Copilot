"""Report Repository for versioned MongoDB persistence."""

from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.database.collections import CollectionName
from app.models.report import Report
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    """Async repository for versioned AI Strategy Reports with dual ObjectId/string support."""

    def __init__(self):
        super().__init__(
            collection_name=CollectionName.AI_REPORTS.value,
            model_class=Report,
        )

    def _build_id_query(self, id_str: str) -> Optional[Dict[str, Any]]:
        """Returns query matching both ObjectId and string versions of an ID."""
        if not id_str:
            return None
        if ObjectId.is_valid(id_str):
            return {"$in": [ObjectId(id_str), str(id_str)]}
        return {"$eq": str(id_str)}

    async def create_versioned_report(self, report_model: Report) -> Report:
        """Inserts a new report incrementing version number for the target startup and report_type."""
        startup_query = self._build_id_query(str(report_model.startup_id))
        report_type_val = report_model.report_type.value if hasattr(report_model.report_type, "value") else str(report_model.report_type)

        # Find latest existing version
        cursor = self.collection.find(
            {"startup_id": startup_query, "report_type": report_type_val}
        ).sort("version", -1).limit(1)

        existing_docs = await cursor.to_list(length=1)
        if existing_docs:
            latest_version = existing_docs[0].get("version", 1)
            report_model.version = latest_version + 1
        else:
            report_model.version = 1

        return await self.create(report_model)

    async def get_latest_report(
        self, startup_id_str: str, report_type_str: str
    ) -> Optional[Report]:
        """Finds the most recent version of a report for a startup."""
        if not ObjectId.is_valid(startup_id_str):
            return None

        cursor = self.collection.find({
            "startup_id": self._build_id_query(startup_id_str),
            "report_type": report_type_str,
        }).sort("version", -1).limit(1)

        docs = await cursor.to_list(length=1)
        if docs:
            return self.model_class(**docs[0])
        return None

    async def get_report_history(
        self, startup_id_str: str, report_type_str: str
    ) -> List[Report]:
        """Returns all versions of a report type for a startup ordered by version descending."""
        if not ObjectId.is_valid(startup_id_str):
            return []

        cursor = self.collection.find({
            "startup_id": self._build_id_query(startup_id_str),
            "report_type": report_type_str,
        }).sort("version", -1)

        docs = await cursor.to_list(length=100)
        return [self.model_class(**doc) for doc in docs]

    async def list_reports_by_startup(
        self, startup_id_str: str, skip: int = 0, limit: int = 50
    ) -> List[Report]:
        """Lists reports for a startup, returning latest versions first."""
        if not ObjectId.is_valid(startup_id_str):
            return []

        cursor = (
            self.collection.find({"startup_id": self._build_id_query(startup_id_str)})
            .sort([("created_at", -1), ("version", -1)])
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [self.model_class(**doc) for doc in docs]

    async def count_reports_by_startup(self, startup_id_str: str) -> int:
        """Counts total reports for a startup."""
        if not ObjectId.is_valid(startup_id_str):
            return 0
        return await self.collection.count_documents({"startup_id": self._build_id_query(startup_id_str)})

    async def get_by_startup_and_id(
        self, startup_id_str: str, report_id_str: str
    ) -> Optional[Report]:
        """Gets a report by ID ensuring startup workspace ownership."""
        if not ObjectId.is_valid(startup_id_str) or not ObjectId.is_valid(report_id_str):
            return None
        return await self.find_one({
            "_id": ObjectId(report_id_str),
            "startup_id": self._build_id_query(startup_id_str),
        })
