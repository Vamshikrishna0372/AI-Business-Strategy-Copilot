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
        """Gets the single active interview for a startup."""
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

    async def get_or_create_active_interview(
        self, startup_id_str: str, user_id_str: str, title: Optional[str] = None
    ) -> Interview:
        """Gets existing interview or creates a single interview document per startup."""
        existing = await self.get_latest_interview(startup_id_str)
        if existing:
            return existing

        now = datetime.now(timezone.utc)
        new_doc = Interview(
            startup_id=ObjectId(startup_id_str),
            user_id=ObjectId(user_id_str),
            title=title or "AI Business Strategy Interview",
            status=InterviewStatus.STARTED,
            current_question_index=1,
            started_at=now,
        )
        return await self.create(new_doc)

    async def add_or_update_qa(
        self,
        interview_id_str: str,
        question_id: str,
        question: str,
        answer: Optional[str] = None,
        category: Optional[str] = None,
        acknowledged: Optional[str] = None,
        rationale: Optional[str] = None,
        knowledge_delta: Optional[Dict[str, Any]] = None,
    ) -> Optional[Interview]:
        """Adds or updates a question-answer pair and merges newly extracted business knowledge."""
        if not ObjectId.is_valid(interview_id_str):
            return None

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
                if acknowledged:
                    qa["acknowledged"] = acknowledged
                if rationale:
                    qa["rationale"] = rationale
                updated = True
                break

        if not updated:
            qa_history.append({
                "question_id": question_id,
                "question": question,
                "answer": answer,
                "category": category,
                "acknowledged": acknowledged,
                "rationale": rationale,
            })

        answered_count = len([q for q in qa_history if q.get("answer")])
        current_idx = min(10, answered_count + 1)

        extracted = doc.get("extracted_knowledge", {})
        if knowledge_delta:
            extracted.update(knowledge_delta)

        now = datetime.now(timezone.utc)
        res = await self.collection.find_one_and_update(
            {"_id": ObjectId(interview_id_str)},
            {
                "$set": {
                    "qa_history": qa_history,
                    "current_question_index": current_idx,
                    "extracted_knowledge": extracted,
                    "updated_at": now,
                    "status": InterviewStatus.IN_PROGRESS.value,
                }
            },
            return_document=True,
        )
        if res:
            return self.model_class(**res)
        return None

    async def pause_interview(self, interview_id_str: str) -> Optional[Interview]:
        """Pauses interview session and records timestamp."""
        now = datetime.now(timezone.utc)
        return await self.update(
            interview_id_str,
            {"status": InterviewStatus.PAUSED.value, "paused_at": now, "updated_at": now},
        )

    async def stop_interview(self, interview_id_str: str) -> Optional[Interview]:
        """Stops interview session (distinct from pause) and writes STOPPED status to MongoDB."""
        now = datetime.now(timezone.utc)
        return await self.update(
            interview_id_str,
            {"status": InterviewStatus.STOPPED.value, "paused_at": now, "updated_at": now},
        )

    async def resume_interview(self, interview_id_str: str) -> Optional[Interview]:
        """Resumes a paused or stopped interview session."""
        now = datetime.now(timezone.utc)
        return await self.update(
            interview_id_str,
            {"status": InterviewStatus.RESUMED.value, "resumed_at": now, "updated_at": now},
        )


    async def reset_interview(
        self, startup_id_str: str, user_id_str: str
    ) -> Interview:
        """Deletes existing interview document for startup and initializes a clean NOT_STARTED session."""
        if ObjectId.is_valid(startup_id_str):
            await self.collection.delete_many({"startup_id": self._build_id_query(startup_id_str)})

        now = datetime.now(timezone.utc)
        new_doc = Interview(
            startup_id=ObjectId(startup_id_str),
            user_id=ObjectId(user_id_str),
            title="AI Business Strategy Interview",
            status=InterviewStatus.NOT_STARTED,
            current_question_index=1,
            started_at=now,
        )
        return await self.create(new_doc)

    async def update_status_and_summary(
        self,
        interview_id_str: str,
        status: InterviewStatus,
        summary: Optional[str] = None,
        knowledge_base: Optional[Dict[str, Any]] = None,
    ) -> Optional[Interview]:
        """Updates interview completion status, summary, and Business Knowledge Base."""
        now = datetime.now(timezone.utc)
        update_dict: Dict[str, Any] = {
            "status": status.value if hasattr(status, "value") else str(status),
            "updated_at": now,
        }
        if summary:
            update_dict["summary"] = summary
        if knowledge_base:
            update_dict["knowledge_base"] = knowledge_base
        if status in [InterviewStatus.COMPLETED, InterviewStatus.KNOWLEDGE_GENERATED, InterviewStatus.ALL_MODULES_UPDATED]:
            update_dict["completed_at"] = now
        return await self.update(interview_id_str, update_dict)
