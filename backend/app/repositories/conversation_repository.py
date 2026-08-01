"""Conversation Repository for MongoDB persistence."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.database.collections import CollectionName
from app.models.conversation import ChatMessage, Conversation
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    """Async repository for managing AI Chat conversations with Startup workspace isolation."""

    def __init__(self):
        super().__init__(
            collection_name=CollectionName.CONVERSATIONS.value,
            model_class=Conversation,
        )

    def _build_id_query(self, id_str: str) -> Optional[Dict[str, Any]]:
        """Returns query matching both ObjectId and string versions of an ID."""
        if not id_str:
            return None
        if ObjectId.is_valid(id_str):
            return {"$in": [ObjectId(id_str), str(id_str)]}
        return {"$eq": str(id_str)}

    async def get_by_startup_and_id(
        self, startup_id_str: str, conversation_id_str: str
    ) -> Optional[Conversation]:
        """Finds a conversation belonging strictly to the specified startup."""
        if not ObjectId.is_valid(startup_id_str) or not ObjectId.is_valid(conversation_id_str):
            return None
        return await self.find_one({
            "_id": ObjectId(conversation_id_str),
            "startup_id": self._build_id_query(startup_id_str),
        })

    async def list_by_startup(
        self,
        startup_id_str: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
    ) -> List[Conversation]:
        """Lists conversations for a startup with optional search and sorting (pinned first, then updated_at)."""
        if not ObjectId.is_valid(startup_id_str):
            return []

        filter_dict: Dict[str, Any] = {"startup_id": self._build_id_query(startup_id_str)}
        if search and search.strip():
            filter_dict["title"] = {"$regex": search.strip(), "$options": "i"}

        cursor = (
            self.collection.find(filter_dict)
            .sort([("is_pinned", -1), ("updated_at", -1)])
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [self.model_class(**doc) for doc in docs]

    async def count_by_startup(
        self, startup_id_str: str, search: Optional[str] = None
    ) -> int:
        """Counts total conversations for a startup."""
        if not ObjectId.is_valid(startup_id_str):
            return 0
        filter_dict: Dict[str, Any] = {"startup_id": self._build_id_query(startup_id_str)}
        if search and search.strip():
            filter_dict["title"] = {"$regex": search.strip(), "$options": "i"}
        return await self.collection.count_documents(filter_dict)

    async def add_message(
        self,
        conversation_id_str: str,
        message: ChatMessage,
        summary: Optional[str] = None,
        suggested_followups: Optional[List[str]] = None,
    ) -> Optional[Conversation]:
        """Appends a new ChatMessage to the conversation thread and updates metadata."""
        if not ObjectId.is_valid(conversation_id_str):
            return None

        update_fields: Dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc),
        }
        if summary:
            update_fields["summary"] = summary
        if suggested_followups is not None:
            update_fields["suggested_followups"] = suggested_followups

        message_dict = message.model_dump()

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(conversation_id_str)},
            {
                "$push": {"messages": message_dict},
                "$set": update_fields,
            },
            return_document=True,
        )
        if result:
            return self.model_class(**result)
        return None

    async def update_title(
        self, conversation_id_str: str, title: str
    ) -> Optional[Conversation]:
        """Renames a conversation title."""
        return await self.update(conversation_id_str, {"title": title})

    async def pin_conversation(
        self, conversation_id_str: str, is_pinned: bool
    ) -> Optional[Conversation]:
        """Pins or unpins a conversation."""
        return await self.update(conversation_id_str, {"is_pinned": is_pinned})

    async def pin_message(
        self, conversation_id_str: str, message_id: str, is_pinned: bool
    ) -> Optional[Conversation]:
        """Pins or unpins a specific message inside a conversation."""
        if not ObjectId.is_valid(conversation_id_str):
            return None

        result = await self.collection.find_one_and_update(
            {
                "_id": ObjectId(conversation_id_str),
                "messages.id": message_id,
            },
            {
                "$set": {
                    "messages.$.is_pinned": is_pinned,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )
        if result:
            return self.model_class(**result)
        return None

    async def delete_by_startup_and_id(
        self, startup_id_str: str, conversation_id_str: str
    ) -> bool:
        """Deletes a conversation ensuring it belongs to the target startup."""
        if not ObjectId.is_valid(startup_id_str) or not ObjectId.is_valid(conversation_id_str):
            return False
        res = await self.collection.delete_one({
            "_id": ObjectId(conversation_id_str),
            "startup_id": self._build_id_query(startup_id_str),
        })
        return res.deleted_count > 0
