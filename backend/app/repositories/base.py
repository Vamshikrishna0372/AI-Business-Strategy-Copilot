"""Generic Base Repository Pattern implementation using Motor Async Driver with dynamic collection resolution."""

from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from app.database.connection import DatabaseManager
from app.models.base import MongoBaseModel

ModelType = TypeVar("ModelType", bound=MongoBaseModel)


class BaseRepository(Generic[ModelType]):
    """Generic async repository interface for MongoDB collection operations."""

    def __init__(self, collection_name: str, model_class: Type[ModelType]):
        self.collection_name = collection_name
        self.model_class = model_class

    @property
    def collection(self) -> AsyncIOMotorCollection:
        """Dynamically resolves collection instance bound to current running event loop."""
        db = DatabaseManager.get_database()
        return db[self.collection_name]

    async def get_by_id(self, id_str: str) -> Optional[ModelType]:
        """Finds document by string ObjectId."""
        if not ObjectId.is_valid(id_str):
            return None
        doc = await self.collection.find_one({"_id": ObjectId(id_str)})
        if doc:
            return self.model_class(**doc)
        return None

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[ModelType]:
        """Finds single document matching filter criteria."""
        doc = await self.collection.find_one(filter_dict)
        if doc:
            return self.model_class(**doc)
        return None

    async def find_many(
        self,
        filter_dict: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> List[ModelType]:
        """Finds multiple documents with pagination and sorting."""
        if filter_dict is None:
            filter_dict = {}

        cursor = (
            self.collection.find(filter_dict)
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [self.model_class(**doc) for doc in docs]

    async def count(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        """Counts documents matching filter criteria."""
        if filter_dict is None:
            filter_dict = {}
        return await self.collection.count_documents(filter_dict)

    async def create(self, model_data: ModelType) -> ModelType:
        """Inserts a new document model."""
        data_dict = model_data.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data_dict and data_dict["_id"] is None:
            del data_dict["_id"]

        result = await self.collection.insert_one(data_dict)
        inserted_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self.model_class(**inserted_doc)

    async def update(self, id_str: str, update_dict: Dict[str, Any]) -> Optional[ModelType]:
        """Updates document by ObjectId string."""
        if not ObjectId.is_valid(id_str):
            return None

        update_dict["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(id_str)},
            {"$set": update_dict},
            return_document=True,
        )
        if result:
            return self.model_class(**result)
        return None

    async def delete(self, id_str: str) -> bool:
        """Deletes document by ObjectId string."""
        if not ObjectId.is_valid(id_str):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0
