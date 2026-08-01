"""Interview Collection Repository with dynamic session support."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.common.enums import InterviewStatus
from app.database.collections import CollectionName
from app.models.interview import Interview, QAPair
from app.repositories.base import BaseRepository


class InterviewRepository(BaseRepository[Interview]):
    """Interview database repository for interactive founder diagnostics."""

    def __init__(self):
        super().__init__(
            collection_name=CollectionName.AI_INTERVIEWS.value,
            model_class=Interview,
        )

    def _build_id_query(self, id_str: str) -> Optional[Dict[str, Any]]:
        if not id_str:
            return None
        if ObjectId.is_valid(id_str):
            return {"$in": [ObjectId(id_str), str(id_str)]}
        return {"$eq": str(id_str)}

    async def get_startup_interviews(self, startup_id_str: str) -> List[Interview]:
        """Finds all AI interviews for a specific startup."""
        if not ObjectId.is_valid(startup_id_str):
            return []
        return await self.find_many(filter_dict={"startup_id": self._build_id_query(startup_id_str)})

    async def get_latest_interview(self, startup_id_str: str) -> Optional[Interview]:
        """Gets the most recent interview for a startup."""
        if not ObjectId.is_valid(startup_id_str):
            return None
        cursor = (
            self.collection.find({"startup_id": self._build_id_query(startup_id_str)})
            .sort("updated_at", -1)
            .limit(1)
        )
        docs = await cursor.to_list(length=1)
        if docs:
            return self.model_class(**docs[0])
        return None

    async def add_or_update_qa(
        self,
        interview_id_str: str,
        question_id: str,
        question: str,
        answer: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Optional[Interview]:
        """Adds or updates a question-answer pair in the interview history."""
        if not ObjectId.is_valid(interview_id_str):
            return None

        # Check if question_id already exists in qa_history
        doc = await self.collection.find_one({"_id": ObjectId(interview_id_str)})
        if not doc:
            return None

        qa_history = doc.get("qa_history", [])
        updated = False
        for qa in qa_history:
            if qa.get("question_id") == question_id:
                qa["answer"] = answer
                if question:
                    qa["question"] = question
                if category:
                    qa["category"] = category
                updated = True
                break

        if not updated:
            qa_history.append({
                "question_id": question_id,
                "question": question,
                "answer": answer,
                "category": category,
            })

        res = await self.collection.find_one_and_update(
            {"_id": ObjectId(interview_id_str)},
            {
                "$set": {
                    "qa_history": qa_history,
                    "updated_at": datetime.now(timezone.utc),
                    "status": InterviewStatus.IN_PROGRESS.value,
                }
            },
            return_document=True,
        )
        if res:
            return self.model_class(**res)
        return None

    async def update_status_and_summary(
        self, interview_id_str: str, status: InterviewStatus, summary: Optional[str] = None
    ) -> Optional[Interview]:
        """Updates interview completion status and summary."""
        update_dict: Dict[str, Any] = {"status": status.value if hasattr(status, "value") else str(status)}
        if summary:
            update_dict["summary"] = summary
        return await self.update(interview_id_str, update_dict)
