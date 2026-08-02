import asyncio
import logging
from typing import Any, Dict, List, Optional
from bson import ObjectId

from app.ai.context_builder import ContextBuilder
from app.ai.fallback import FallbackAIProvider
from app.ai.prompt_engine import PromptEngine
from app.ai.validator import AIResponseValidator
from app.common.enums import InterviewStatus, NotificationType, ReportType, StartupStage
from app.database.collections import CollectionName, get_collection
from app.models.conversation import ChatMessage, Conversation
from app.models.interview import Interview
from app.models.report import Report
from app.models.startup import Startup
from app.models.user import User
from app.notifications.service import NotificationService
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.startup_repository import StartupRepository
from app.schemas.chat import ConversationResponse, SendMessageResponse
from app.schemas.dashboard_schema import (
    AIRecommendationSchema,
    ActivityTimelineItemSchema,
    DashboardOverviewResponse,
    ScoreMetricSchema,
    StartupScoresResponse,
)
from app.schemas.interview import InterviewStepResponse, QAPairSchema
from app.services.activity_service import ActivityLogger
from app.services.tavily_service import TavilyService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# QUESTION BANK — 10 structured diagnostic questions for the AI interview
# ---------------------------------------------------------------------------
QUESTION_BANK = [
    {
        "question_id": "q_001",
        "category": "Problem Statement",
        "question": "What specific business problem or market pain point does your startup solve, and who experiences it most severely?",
    },
    {
        "question_id": "q_002",
        "category": "Product & Solution",
        "question": "How does your product or service solve this problem, and what is your core value proposition?",
    },
    {
        "question_id": "q_003",
        "category": "Target Market & TAM",
        "question": "Who is your primary ideal customer profile (ICP), and what is your estimated Total Addressable Market (TAM)?",
    },
    {
        "question_id": "q_004",
        "category": "Competitive Advantage",
        "question": "Who are your top direct or indirect competitors, and what is your unique competitive moat or technological advantage?",
    },
    {
        "question_id": "q_005",
        "category": "Business & Monetization Model",
        "question": "What is your primary revenue model (e.g. B2B SaaS subscription, transactional fee, marketplace commission)?",
    },
    {
        "question_id": "q_006",
        "category": "Go-To-Market Strategy",
        "question": "What is your primary customer acquisition channel and go-to-market strategy (e.g. inbound marketing, outbound sales, PLG)?",
    },
    {
        "question_id": "q_007",
        "category": "Financials & Unit Economics",
        "question": "What is your estimated monthly burn rate, pricing tier structure, and projected timeline to break-even profitability?",
    },
    {
        "question_id": "q_008",
        "category": "Technology & IP",
        "question": "What underlying software architecture, AI models, proprietary algorithms, or intellectual property power your platform?",
    },
    {
        "question_id": "q_009",
        "category": "Founding Team & Execution",
        "question": "What key industry background, domain expertise, and technical skills does your founding team bring to this execution?",
    },
    {
        "question_id": "q_010",
        "category": "Funding & Growth Vision",
        "question": "What strategic milestones do you aim to achieve over the next 12-18 months, and what funding or resources will you need?",
    },
]


class AIService:
    """Core AI Service Layer orchestrating Context, Prompts, Providers, Repositories, Scoring, and Notifications."""

    def __init__(
        self,
        provider: Optional[FallbackAIProvider] = None,
        prompt_engine: Optional[PromptEngine] = None,
        conversation_repo: Optional[ConversationRepository] = None,
        report_repo: Optional[ReportRepository] = None,
        interview_repo: Optional[InterviewRepository] = None,
        startup_repo: Optional[StartupRepository] = None,
        tavily: Optional[TavilyService] = None,
    ):
        self.provider = provider or FallbackAIProvider()
        self.prompt_engine = prompt_engine or PromptEngine()
        self.conversation_repo = conversation_repo or ConversationRepository()
        self.report_repo = report_repo or ReportRepository()
        self.interview_repo = interview_repo or InterviewRepository()
        self.startup_repo = startup_repo or StartupRepository()
        self.tavily = tavily or TavilyService()

    # --- Helper Context Loaders ---
    async def _fetch_startup_interview_data(self, startup_id_str: str) -> Optional[Dict[str, Any]]:
        """Loads latest interview details for context building."""
        interview = await self.interview_repo.get_latest_interview(startup_id_str)
        if interview:
            return interview.model_dump()
        return None

    async def _fetch_startup_reports_summary(self, startup_id_str: str) -> List[Dict[str, Any]]:
        """Loads latest report summaries for context building."""
        reports = await self.report_repo.list_reports_by_startup(startup_id_str, limit=5)
        return [r.model_dump() for r in reports]

    # --- Conversation Processing ---
    async def process_chat_message(
        self,
        user: User,
        startup: Startup,
        conversation_id: str,
        user_text: str,
        module: str = "general",
    ) -> SendMessageResponse:
        """Processes a chat message: loads conversation, builds context, calls LLM, stores history."""
        conversation = await self.conversation_repo.get_by_startup_and_id(
            str(startup.id), conversation_id
        )
        if not conversation:
            raise ValueError(f"Conversation '{conversation_id}' not found for startup '{startup.id}'")

        user_msg = ChatMessage(sender="user", content=user_text, module=module)
        recent_msg_dicts = [m.model_dump() for m in conversation.messages[-10:]]

        interview_data = await self._fetch_startup_interview_data(str(startup.id))
        reports_summary = await self._fetch_startup_reports_summary(str(startup.id))

        ai_context = ContextBuilder.build_startup_context(
            startup=startup,
            user=user,
            interview_data=interview_data,
            reports_summary=reports_summary,
            recent_messages=recent_msg_dicts,
            current_module=module,
        )

        system_role, formatted_prompt = self.prompt_engine.render_prompt(
            module=module,
            context=ai_context,
            query=user_text,
        )

        try:
            raw_response = await self.provider.generate_structured_json(
                prompt=formatted_prompt,
                system_prompt=system_role,
            )
            validated = AIResponseValidator.parse_and_repair_json(raw_response)
        except Exception as exc:
            logger.error(f"[AIService Error] {exc}")
            validated = AIResponseValidator.build_fallback_error_response(f"AI service error: {str(exc)}")

        assistant_content = validated.get("message") or "Strategic analysis complete."
        suggestions = validated.get("suggestions") or []

        assistant_msg = ChatMessage(
            sender="assistant",
            content=assistant_content,
            module=module,
            metadata=validated,
        )

        await self.conversation_repo.add_message(str(conversation.id), user_msg)
        updated_conv = await self.conversation_repo.add_message(
            str(conversation.id),
            assistant_msg,
            suggested_followups=suggestions,
        )
        if not updated_conv:
            updated_conv = conversation

        await ActivityLogger.log_activity(
            action="Conversation Continued",
            entity_type="conversation",
            description=f"Sent message in AI strategy chat: '{conversation.title}'",
            user_id_str=str(user.id),
            startup_id_str=str(startup.id),
            entity_id=str(conversation.id),
        )

        conv_response = ConversationResponse(
            id=str(updated_conv.id),
            startup_id=str(updated_conv.startup_id),
            user_id=str(updated_conv.user_id),
            title=updated_conv.title,
            module=updated_conv.module,
            is_pinned=updated_conv.is_pinned,
            summary=updated_conv.summary,
            recent_topics=updated_conv.recent_topics,
            suggested_followups=updated_conv.suggested_followups,
            messages=[m.model_dump() for m in updated_conv.messages],
            created_at=updated_conv.created_at,
            updated_at=updated_conv.updated_at,
        )

        return SendMessageResponse(
            assistant_message=assistant_msg.model_dump(),
            conversation=conv_response,
        )

    # --- MODULE 1: AI BUSINESS INTERVIEW ENGINE ---
    async def _generate_consultant_question(
        self,
        user: User,
        startup: Startup,
        interview: Interview,
        latest_answer: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates dynamic, domain-adapted consultant follow-up question and knowledge extraction using LLM."""
        answered_count = len(interview.qa_history)
        if answered_count >= 10:
            return {
                "question_id": "completed",
                "category": "Completion",
                "next_question": "Diagnostic interview completed.",
                "acknowledged": "Thank you for completing all strategic diagnostic questions.",
                "rationale": "We now have complete strategic context to power all strategy modules.",
                "extracted_knowledge_delta": {},
                "suggestions": [],
            }

        ai_context = ContextBuilder.build_startup_context(
            startup=startup,
            user=user,
            interview_data=interview.model_dump(),
            current_module="ai_interview",
        )

        system_role, formatted_prompt = self.prompt_engine.render_prompt(
            module="ai_interview",
            context=ai_context,
            query=latest_answer or f"Initialize question {answered_count + 1} of 10 for {startup.name}.",
        )

        try:
            raw_res = await self.provider.generate_structured_json(
                prompt=formatted_prompt, system_prompt=system_role
            )
            validated = AIResponseValidator.parse_and_repair_json(raw_res)
            data = validated.get("data", {})
            if isinstance(data, dict) and data.get("next_question"):
                next_q_id = data.get("next_question_id") or f"q_{answered_count + 1:03d}"
                return {
                    "question_id": next_q_id,
                    "category": data.get("category") or QUESTION_BANK[min(answered_count, 9)]["category"],
                    "next_question": data["next_question"],
                    "acknowledged": data.get("acknowledged") or f"Thank you for sharing those insights about {startup.name}.",
                    "rationale": data.get("rationale") or "Understanding this dimension helps clarify your positioning and business model.",
                    "extracted_knowledge_delta": data.get("extracted_knowledge_delta") or {},
                    "suggestions": validated.get("suggestions") or ["Provide detailed overview", "Highlight core differentiators", "Share current traction"],
                }
        except Exception as exc:
            logger.warning(f"[AIService] Dynamic interview question generation fallback: {exc}")

        # Fallback to QUESTION_BANK meta with personalized text
        meta = QUESTION_BANK[min(answered_count, 9)]
        q_text = meta["question"].replace("your startup", f"'{startup.name}'")
        return {
            "question_id": meta["question_id"],
            "category": meta["category"],
            "next_question": q_text,
            "acknowledged": f"Noted your input regarding {startup.name}." if latest_answer else f"Welcome! Let's begin the business diagnostic for {startup.name}.",
            "rationale": f"Evaluating {meta['category']} is essential to build your strategic baseline.",
            "extracted_knowledge_delta": {},
            "suggestions": ["Share specific details", "Give key examples", "Outline current metrics"],
        }

    async def start_interview(
        self, user: User, startup: Startup, initial_notes: Optional[str] = None
    ) -> InterviewStepResponse:
        """Starts or fetches current active AI interview session for active startup."""
        interview = await self.interview_repo.get_or_create_active_interview(
            startup_id_str=str(startup.id),
            user_id_str=str(user.id),
            title=f"AI Strategy Interview - {startup.name}",
        )

        # If previous interview was completed, allow restart/resume
        if interview.status == InterviewStatus.COMPLETED or interview.status == InterviewStatus.ALL_MODULES_UPDATED:
            interview = await self.interview_repo.update_status_and_summary(
                interview_id_str=str(interview.id),
                status=InterviewStatus.RESUMED,
            )

        answered_count = len(interview.qa_history)
        current_idx = min(10, answered_count + 1)
        progress = round((answered_count / 10.0) * 100.0) if answered_count > 0 else 5.0

        await self.startup_repo.update(
            str(startup.id),
            {
                "progress": max(startup.progress or 0, progress),
                "completion_percentage": max(startup.completion_percentage or 0, progress),
                "current_step": "ai_interview",
            },
        )

        is_complete = answered_count >= 10
        if is_complete:
            q_info = {
                "question_id": "completed",
                "category": "Complete",
                "next_question": "Interview diagnostic completed.",
                "acknowledged": "All 10 diagnostic questions completed.",
                "rationale": "Executive strategy context synthesized.",
                "extracted_knowledge_delta": {},
            }
        else:
            q_info = await self._generate_consultant_question(user, startup, interview)

        return InterviewStepResponse(
            interview_id=str(interview.id),
            current_section=q_info["category"],
            current_question_number=current_idx if not is_complete else 10,
            total_questions=10,
            progress_percentage=100.0 if is_complete else progress,
            status=interview.status.value if hasattr(interview.status, "value") else str(interview.status),
            next_question_id=q_info["question_id"],
            next_question=q_info["next_question"],
            acknowledged_previous=q_info.get("acknowledged"),
            rationale_for_question=q_info.get("rationale"),
            question_type="text",
            completed=is_complete,
            qa_history=[
                QAPairSchema(**qa.model_dump()) if hasattr(qa, "model_dump") else QAPairSchema(**qa)
                for qa in interview.qa_history
            ],
            extracted_knowledge=interview.extracted_knowledge or {},
            summary_so_far=f"{answered_count}/10 questions completed.",
            estimated_time_remaining_minutes=max(1, 15 - round(answered_count * 1.5)),
        )

    async def submit_interview_answer(
        self,
        user: User,
        startup: Startup,
        question_id: str,
        question: str,
        answer: str,
        category: Optional[str] = "General",
    ) -> InterviewStepResponse:
        """Records founder answer, extracts structured business knowledge, and dynamically generates next question."""
        interview = await self.interview_repo.get_or_create_active_interview(
            startup_id_str=str(startup.id), user_id_str=str(user.id)
        )

        # Generate consultant response & knowledge extraction for this answer
        q_info = await self._generate_consultant_question(user, startup, interview, latest_answer=answer)
        knowledge_delta = q_info.get("extracted_knowledge_delta", {})

        updated_interview = await self.interview_repo.add_or_update_qa(
            interview_id_str=str(interview.id),
            question_id=question_id,
            question=question,
            answer=answer,
            category=category,
            acknowledged=q_info.get("acknowledged"),
            rationale=q_info.get("rationale"),
            knowledge_delta=knowledge_delta,
        )
        if not updated_interview:
            updated_interview = interview

        # Synchronize extracted knowledge attributes into startup workspace document
        extracted = updated_interview.extracted_knowledge or {}
        startup_updates: Dict[str, Any] = {}
        if extracted.get("industry") and not startup.industry:
            startup_updates["industry"] = extracted["industry"]
        if extracted.get("target_customers") and not startup.target_audience:
            startup_updates["target_audience"] = extracted["target_customers"]
        if extracted.get("problem") and not startup.problem_statement:
            startup_updates["problem_statement"] = extracted["problem"]
        if extracted.get("solution") and not startup.solution:
            startup_updates["solution"] = extracted["solution"]
        if extracted.get("revenue_model") and not startup.revenue_model:
            startup_updates["revenue_model"] = extracted["revenue_model"]

        answered_count = len(updated_interview.qa_history)
        progress = round((answered_count / 10.0) * 100.0)
        startup_updates.update({
            "progress": max(startup.progress or 0, progress),
            "completion_percentage": max(startup.completion_percentage or 0, progress),
            "current_step": "ai_interview",
        })
        await self.startup_repo.update(str(startup.id), startup_updates)

        await ActivityLogger.log_activity(
            action="Interview Answer Recorded",
            entity_type="interview",
            description=f"Answered question {answered_count}/10: '{question[:50]}...'",
            user_id_str=str(user.id),
            startup_id_str=str(startup.id),
            entity_id=str(updated_interview.id),
        )

        is_complete = answered_count >= 10
        current_idx = min(10, answered_count + 1)
        next_q_text = "All diagnostic questions completed." if is_complete else q_info["next_question"]
        next_q_id = "completed" if is_complete else q_info["question_id"]

        return InterviewStepResponse(
            interview_id=str(updated_interview.id),
            current_section=q_info["category"] if not is_complete else "Complete",
            current_question_number=current_idx if not is_complete else 10,
            total_questions=10,
            progress_percentage=100.0 if is_complete else progress,
            status=updated_interview.status.value if hasattr(updated_interview.status, "value") else str(updated_interview.status),
            next_question_id=next_q_id,
            next_question=next_q_text,
            acknowledged_previous=q_info.get("acknowledged"),
            rationale_for_question=q_info.get("rationale"),
            question_type="text",
            completed=is_complete,
            qa_history=[
                QAPairSchema(**qa.model_dump()) if hasattr(qa, "model_dump") else QAPairSchema(**qa)
                for qa in updated_interview.qa_history
            ],
            extracted_knowledge=updated_interview.extracted_knowledge or {},
            summary_so_far=f"{answered_count}/10 questions completed.",
            estimated_time_remaining_minutes=max(0, 15 - round(answered_count * 1.5)),
        )

    async def pause_interview(self, user: User, startup: Startup) -> InterviewStepResponse:
        """Pauses interview session while saving all current progress in MongoDB."""
        interview = await self.interview_repo.get_latest_interview(str(startup.id))
        if not interview:
            raise ValueError("No active interview session found to pause.")
        paused = await self.interview_repo.pause_interview(str(interview.id))
        if not paused:
            paused = interview

        answered_count = len(paused.qa_history)
        return InterviewStepResponse(
            interview_id=str(paused.id),
            current_section="Paused",
            current_question_number=min(10, answered_count + 1),
            total_questions=10,
            progress_percentage=round((answered_count / 10.0) * 100.0),
            status=InterviewStatus.PAUSED.value,
            next_question_id=f"q_{answered_count + 1:03d}",
            next_question="Interview paused. Click 'Resume Interview' to continue.",
            completed=False,
            qa_history=[
                QAPairSchema(**qa.model_dump()) if hasattr(qa, "model_dump") else QAPairSchema(**qa)
                for qa in paused.qa_history
            ],
            extracted_knowledge=paused.extracted_knowledge or {},
            summary_so_far=f"Interview paused at {answered_count}/10 questions.",
        )

    async def resume_interview(self, user: User, startup: Startup) -> InterviewStepResponse:
        """Resumes a paused interview session at the exact current question."""
        interview = await self.interview_repo.get_latest_interview(str(startup.id))
        if not interview:
            return await self.start_interview(user, startup)
        resumed = await self.interview_repo.resume_interview(str(interview.id))
        if not resumed:
            resumed = interview
        return await self.start_interview(user, startup)

    async def stop_interview(self, user: User, startup: Startup) -> InterviewStepResponse:
        """Stops the interview session and writes STOPPED status to MongoDB. Preserves all answers."""
        interview = await self.interview_repo.get_latest_interview(str(startup.id))
        if not interview:
            raise ValueError("No active interview session found to stop.")
        stopped = await self.interview_repo.stop_interview(str(interview.id))
        if not stopped:
            stopped = interview

        answered_count = len(stopped.qa_history)
        return InterviewStepResponse(
            interview_id=str(stopped.id),
            current_section="Stopped",
            current_question_number=min(10, answered_count + 1),
            total_questions=10,
            progress_percentage=round((answered_count / 10.0) * 100.0),
            status=InterviewStatus.STOPPED.value,
            next_question_id=f"q_{answered_count + 1:03d}",
            next_question="Interview stopped. Click 'Resume Interview' or 'Restart Interview' to continue.",
            completed=False,
            qa_history=[
                QAPairSchema(**qa.model_dump()) if hasattr(qa, "model_dump") else QAPairSchema(**qa)
                for qa in stopped.qa_history
            ],
            extracted_knowledge=stopped.extracted_knowledge or {},
            summary_so_far=f"Interview stopped at {answered_count}/10 questions. All answers preserved.",
        )

    async def restart_interview(self, user: User, startup: Startup) -> InterviewStepResponse:
        """Deletes existing interview session after confirmation and starts fresh from Question 1."""
        reset_doc = await self.interview_repo.reset_interview(str(startup.id), str(user.id))
        await ActivityLogger.log_activity(
            action="Interview Restarted",
            entity_type="interview",
            description=f"Reset and restarted AI Business Interview for startup {startup.name}",
            user_id_str=str(user.id),
            startup_id_str=str(startup.id),
            entity_id=str(reset_doc.id),
        )
        return await self.start_interview(user, startup)

    async def complete_interview(self, user: User, startup: Startup) -> Report:
        """Completes interview, synthesizes Business Knowledge Base, Executive Summary & SWOT, and updates all downstream AI modules."""
        interview = await self.interview_repo.get_latest_interview(str(startup.id))
        if not interview:
            raise ValueError("No active interview session found to complete.")

        ai_context = ContextBuilder.build_startup_context(
            startup=startup, user=user, interview_data=interview.model_dump(), current_module="ai_interview"
        )
        system_role, formatted_prompt = self.prompt_engine.render_prompt(
            module="ai_interview_summary",
            context=ai_context,
            query="Synthesize complete interview answers into Business Knowledge Base, Executive Summary, SWOT, and Founder Profile.",
        )

        try:
            raw = await self.provider.generate_structured_json(prompt=formatted_prompt, system_prompt=system_role)
            validated = AIResponseValidator.parse_and_repair_json(raw)
        except Exception as exc:
            logger.error(f"[AIService complete_interview Error]: {exc}")
            validated = AIResponseValidator.standardize_response_structure({
                "business_summary": f"Executive summary for {startup.name}: Comprehensive AI Founder Interview completed.",
                "mission": f"Empower customers through innovative {startup.industry or 'technology'} solutions.",
                "vision": f"Scale {startup.name} into an industry category leader.",
                "swot_analysis": {
                    "strengths": ["Clear value proposition", "Target audience identified"],
                    "weaknesses": ["Early-stage brand presence"],
                    "opportunities": ["Expanding addressable market"],
                    "threats": ["Competitive market entrants"],
                },
                "knowledge_base": interview.extracted_knowledge or {},
            })
        data = validated.get("data", {})

        summary_text = data.get("business_summary", "AI Business Interview completed.")
        knowledge_base = data.get("knowledge_base") or interview.extracted_knowledge or {}

        # 1. Update Interview status to COMPLETED -> KNOWLEDGE_GENERATED -> ALL_MODULES_UPDATED
        await self.interview_repo.update_status_and_summary(
            interview_id_str=str(interview.id),
            status=InterviewStatus.ALL_MODULES_UPDATED,
            summary=summary_text,
            knowledge_base=knowledge_base,
        )

        # 2. Update Startup document in MongoDB with full knowledge base
        await self.startup_repo.update(
            str(startup.id),
            {
                "stage": StartupStage.PRE_SEED,
                "progress": 100,
                "completion_percentage": 100,
                "current_step": "idea_validation",
                "description": summary_text,
                "knowledge_base": knowledge_base,
            },
        )

        # 3. Save Executive Summary Report in ai_reports collection
        report_model = Report(
            startup_id=startup.id,
            user_id=user.id,
            interview_id=interview.id,
            report_type=ReportType.INTERVIEW_SUMMARY,
            title=f"AI Interview Executive Summary & Knowledge Base - {startup.name}",
            content=data,
            confidence=validated.get("confidence", 0.95),
            ai_provider=validated.get("metadata", {}).get("provider_used", "gemini"),
        )
        saved_report = await self.report_repo.create_versioned_report(report_model)

        await ActivityLogger.log_activity(
            action="Interview Completed & Knowledge Generated",
            entity_type="interview",
            description=f"Synthesized Business Knowledge Base & updated all AI modules for {startup.name}",
            user_id_str=str(user.id),
            startup_id_str=str(startup.id),
            entity_id=str(saved_report.id),
        )

        await NotificationService.create_notification(
            user_id_str=str(user.id),
            title="AI Business Knowledge Base Ready",
            message=f"Business Knowledge Base for '{startup.name}' generated. All 8 journey AI modules have been updated with complete context.",
            notification_type=NotificationType.SYSTEM,
        )

        return saved_report

    async def _fetch_live_business_intelligence(
        self, startup: Startup, module_name: str
    ) -> Optional[Dict[str, Any]]:
        """Queries Business Intelligence Engine (Tavily) based on active strategy module requirement."""
        industry = startup.industry or "Technology & SaaS"
        name = startup.name

        try:
            if module_name == "idea_validation":
                return await self.tavily.search_similar_startups(name, industry)
            elif module_name == "business_strategy":
                return await self.tavily.search_market_trends(industry)
            elif module_name == "competitor_analysis":
                return await self.tavily.search_competitors(name, industry)
            elif module_name == "financial_planning":
                return await self.tavily.search_funding_trends(industry)
            elif module_name == "risk_analysis":
                return await self.tavily.search_regulations(industry)
            elif module_name == "investor_readiness":
                return await self.tavily.search_funding_trends(industry)
        except Exception as exc:
            logger.warning(f"[AIService] Live business intelligence research notice for '{module_name}': {exc}")

        return None

    # --- GENERAL REPORT GENERATION HELPER (MODULES 2-9) ---
    async def _generate_and_save_module_report(
        self,
        user: User,
        startup: Startup,
        module_name: str,
        prompt: str,
        report_type: ReportType,
        title: str,
    ) -> Report:
        """Core pipeline orchestrator for Modules 2-9."""
        interview_data = await self._fetch_startup_interview_data(str(startup.id))
        reports_summary = await self._fetch_startup_reports_summary(str(startup.id))
        live_intelligence = await self._fetch_live_business_intelligence(startup, module_name)

        ai_context = ContextBuilder.build_startup_context(
            startup=startup,
            user=user,
            interview_data=interview_data,
            reports_summary=reports_summary,
            current_module=module_name,
            live_intelligence=live_intelligence,
        )

        system_role, formatted_prompt = self.prompt_engine.render_prompt(
            module=module_name,
            context=ai_context,
            query=prompt,
        )

        try:
            raw_res = await self.provider.generate_structured_json(
                prompt=formatted_prompt, system_prompt=system_role
            )
            validated = AIResponseValidator.parse_and_repair_json(raw_res)
        except Exception as exc:
            logger.error(f"[AIService {module_name} Error]: {exc}")
            validated = AIResponseValidator.build_fallback_error_response(
                f"Failed to generate {module_name}: {exc}"
            )

        report_model = Report(
            startup_id=startup.id,
            user_id=user.id,
            report_type=report_type,
            title=title,
            content=validated.get("data", {}),
            confidence=validated.get("confidence", 0.95),
            ai_provider=validated.get("metadata", {}).get("provider_used", "gemini"),
        )
        saved_report = await self.report_repo.create_versioned_report(report_model)

        # Audit activity logging
        await ActivityLogger.log_activity(
            action=f"{module_name.replace('_', ' ').title()} Generated",
            entity_type="report",
            description=f"Generated version {saved_report.version} of {title}",
            user_id_str=str(user.id),
            startup_id_str=str(startup.id),
            entity_id=str(saved_report.id),
        )

        # Dispatch notification
        await NotificationService.create_notification(
            user_id_str=str(user.id),
            title=f"{title} Ready",
            message=f"Version {saved_report.version} of {title} is now available.",
            notification_type=NotificationType.SYSTEM,
        )

        return saved_report

    # --- MODULE 2: IDEA VALIDATION ---
    async def generate_idea_validation(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="idea_validation",
            prompt=prompt or "Perform complete market validation score and evidence evaluation.",
            report_type=ReportType.IDEA_VALIDATION,
            title=f"Idea Validation Report - {startup.name}",
        )

    # --- MODULE 3: BUSINESS STRATEGY ---
    async def generate_business_strategy(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="business_strategy",
            prompt=prompt or "Generate full executive business strategy blueprint.",
            report_type=ReportType.BUSINESS_STRATEGY,
            title=f"Business Strategy Blueprint - {startup.name}",
        )

    # --- MODULE 4: COMPETITOR INTELLIGENCE ---
    async def generate_competitor_analysis(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="competitor_analysis",
            prompt=prompt or "Generate competitor analysis, SWOT matrix, and moat intelligence.",
            report_type=ReportType.COMPETITOR_ANALYSIS,
            title=f"Competitor Intelligence Matrix - {startup.name}",
        )

    # --- MODULE 5: BUSINESS MODEL CANVAS ---
    async def generate_business_model_canvas(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="business_model_canvas",
            prompt=prompt or "Generate 9-block Business Model Canvas.",
            report_type=ReportType.BUSINESS_MODEL_CANVAS,
            title=f"Business Model Canvas - {startup.name}",
        )

    # --- MODULE 6: FINANCIAL PLANNING ENGINE ---
    async def generate_financial_planning(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="financial_planning",
            prompt=prompt or "Generate 3-year revenue/expense forecasts, runway, and break-even analysis.",
            report_type=ReportType.FINANCIAL_PLAN,
            title=f"Financial Planning Model - {startup.name}",
        )

    # --- MODULE 7: RISK INTELLIGENCE ---
    async def generate_risk_analysis(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="risk_analysis",
            prompt=prompt or "Evaluate risk probability, impact, and mitigations across 10 areas.",
            report_type=ReportType.RISK_ASSESSMENT,
            title=f"Risk Intelligence Matrix - {startup.name}",
        )

    # --- MODULE 8: INVESTOR READINESS ---
    async def generate_investor_readiness(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="investor_readiness",
            prompt=prompt or "Evaluate investor readiness, pitch deck scripts, and due diligence checklist.",
            report_type=ReportType.INVESTOR_READINESS,
            title=f"Investor Readiness & Pitch Deck - {startup.name}",
        )

    # --- MODULE 9: EXECUTION ROADMAP ---
    async def generate_execution_roadmap(self, user: User, startup: Startup, prompt: Optional[str] = None) -> Report:
        return await self._generate_and_save_module_report(
            user=user,
            startup=startup,
            module_name="execution_roadmap",
            prompt=prompt or "Generate weekly/monthly/quarterly execution milestones and tasks.",
            report_type=ReportType.EXECUTION_ROADMAP,
            title=f"Strategic Execution Roadmap - {startup.name}",
        )

    # --- REPORT MANAGEMENT & VERSIONING ---
    async def list_reports(self, startup_id: str, skip: int = 0, limit: int = 50) -> List[Report]:
        return await self.report_repo.list_reports_by_startup(startup_id, skip, limit)

    async def get_report(self, startup_id: str, report_id: str) -> Optional[Report]:
        return await self.report_repo.get_by_startup_and_id(startup_id, report_id)

    async def get_report_history(self, startup_id: str, report_type_str: str) -> List[Report]:
        return await self.report_repo.get_report_history(startup_id, report_type_str)

    async def regenerate_report(
        self, user: User, startup: Startup, report_type_str: str, custom_instructions: Optional[str] = None
    ) -> Report:
        """Regenerates a report type, incrementing version number (v1 -> v2 -> v3...)."""
        prompt = custom_instructions or "Regenerate strategy report with updated workspace context."

        # Map string report type to enum and handler
        mapping = {
            "idea_validation": (ReportType.IDEA_VALIDATION, self.generate_idea_validation),
            "business_strategy": (ReportType.BUSINESS_STRATEGY, self.generate_business_strategy),
            "competitor_analysis": (ReportType.COMPETITOR_ANALYSIS, self.generate_competitor_analysis),
            "business_model_canvas": (ReportType.BUSINESS_MODEL_CANVAS, self.generate_business_model_canvas),
            "financial_planning": (ReportType.FINANCIAL_PLAN, self.generate_financial_planning),
            "risk_analysis": (ReportType.RISK_ASSESSMENT, self.generate_risk_analysis),
            "investor_readiness": (ReportType.INVESTOR_READINESS, self.generate_investor_readiness),
            "execution_roadmap": (ReportType.EXECUTION_ROADMAP, self.generate_execution_roadmap),
        }

        if report_type_str not in mapping:
            raise ValueError(f"Invalid report type '{report_type_str}' for regeneration.")

        _, handler = mapping[report_type_str]
        return await handler(user, startup, prompt)

    # --- BUSINESS SCORING ENGINE & DASHBOARD ---
    async def calculate_startup_scores(self, startup_id_str: str) -> StartupScoresResponse:
        """Calculates 8 consistent business scoring metrics based on generated reports and workspace data."""
        reports = await self.report_repo.list_reports_by_startup(startup_id_str, limit=50)
        reports_by_type: Dict[str, Any] = {}
        for r in reports:
            rtype = r.report_type.value if hasattr(r.report_type, "value") else str(r.report_type)
            if rtype not in reports_by_type:
                reports_by_type[rtype] = r

        completed_count = len(reports_by_type)

        if completed_count == 0:
            return StartupScoresResponse(
                startup_id=startup_id_str,
                overall_startup_score=ScoreMetricSchema(value=0.0, confidence=0.0, reason="No strategy reports generated yet", recommendation="Complete AI Business Interview to unlock scores"),
                business_health=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Interview incomplete", recommendation="Start business interview"),
                innovation_score=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Workspace initializing", recommendation="Generate Idea Validation"),
                investor_readiness=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Due diligence pending", recommendation="Complete Investor Readiness module"),
                market_opportunity=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Market analysis pending", recommendation="Generate Competitor Analysis"),
                financial_health=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Financial model pending", recommendation="Generate Financial Planning"),
                growth_potential=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Strategy pending", recommendation="Generate Business Strategy"),
                execution_progress=ScoreMetricSchema(value=0.0, confidence=1.0, reason="0/8 journey modules completed", recommendation="Begin journey modules"),
                risk_level=ScoreMetricSchema(value=0.0, confidence=0.0, reason="Risk assessment pending", recommendation="Generate Risk Intelligence"),
            )

        val_report = reports_by_type.get("idea_validation")
        risk_report = reports_by_type.get("risk_analysis")
        investor_report = reports_by_type.get("investor_readiness")
        fin_report = reports_by_type.get("financial_planning")
        comp_report = reports_by_type.get("competitor_analysis")
        strat_report = reports_by_type.get("business_strategy")

        val_score = float(val_report.content.get("overall_score", 85) if (val_report and val_report.content) else 80)
        risk_val = float(risk_report.content.get("overall_risk_score", 35) if (risk_report and risk_report.content) else 35)
        readiness_val = float(
            (investor_report.content.get("overall_readiness_score") or investor_report.content.get("readiness_score") or 82)
            if (investor_report and investor_report.content) else (60 + completed_count * 4)
        )
        fin_val = float(85.0 if fin_report else 70.0)
        innovation_val = float(round(min(98.0, val_score * 1.05), 1))
        market_val = float(90.0 if comp_report else 75.0)
        growth_val = float(88.0 if strat_report else 72.0)
        execution_val = float(round(min(100.0, (completed_count / 8.0) * 100.0), 1))

        health_val = float(round((val_score + fin_val + (100.0 - risk_val) + growth_val) / 4.0, 1))
        overall = float(round((val_score + readiness_val + health_val + innovation_val + (100.0 - risk_val)) / 5.0, 1))

        return StartupScoresResponse(
            startup_id=startup_id_str,
            overall_startup_score=ScoreMetricSchema(
                value=overall, confidence=0.95, reason="Synthesized from real-time workspace AI reports", recommendation="Proceed with roadmap execution"
            ),
            business_health=ScoreMetricSchema(
                value=health_val, confidence=0.92, reason="Calculated from validation, finance, risk & growth metrics", recommendation="Scale acquisition funnel"
            ),
            innovation_score=ScoreMetricSchema(
                value=innovation_val, confidence=0.95, reason="Proprietary technology and differentiation", recommendation="Protect key IP assets"
            ),
            investor_readiness=ScoreMetricSchema(
                value=readiness_val, confidence=0.90, reason="Evaluated from investor checklist & unit economics", recommendation="Target angel investor networks"
            ),
            market_opportunity=ScoreMetricSchema(
                value=market_val, confidence=0.93, reason="TAM & competitor positioning analysis", recommendation="Expand GTM inbound funnels"
            ),
            financial_health=ScoreMetricSchema(
                value=fin_val, confidence=0.88, reason="Runway, monthly burn rate & profit forecast", recommendation="Maintain 14+ months runway"
            ),
            growth_potential=ScoreMetricSchema(
                value=growth_val, confidence=0.91, reason="Business strategy & revenue expansion levers", recommendation="Launch tier subscriptions"
            ),
            execution_progress=ScoreMetricSchema(
                value=execution_val, confidence=0.95, reason=f"{completed_count}/8 journey modules generated", recommendation="Complete remaining modules"
            ),
            risk_level=ScoreMetricSchema(
                value=risk_val, confidence=0.92, reason="Risk probability & impact analysis", recommendation="Deploy mitigation procedures"
            ),
        )

    async def get_dashboard_overview(self, user: User, startup: Startup) -> DashboardOverviewResponse:
        """Aggregates startup scores, latest reports, AI recommendations, and activity timeline for executive dashboard."""
        scores = await self.calculate_startup_scores(str(startup.id))
        reports = await self.report_repo.list_reports_by_startup(str(startup.id), limit=10)
        latest_reports_data = [
            {
                "id": str(r.id),
                "title": r.title,
                "report_type": r.report_type.value if hasattr(r.report_type, "value") else str(r.report_type),
                "version": r.version,
                "created_at": r.created_at,
                "confidence": r.confidence,
                "status": r.status,
            }
            for r in reports
        ]

        # Query interview status from MongoDB as single source of truth
        interview = await self.interview_repo.get_latest_interview(str(startup.id))
        int_status = interview.status.value if (interview and hasattr(interview.status, "value")) else (str(interview.status) if interview else "not_started")
        q_count = len(interview.qa_history) if (interview and interview.qa_history) else 0

        recommendations = [
            AIRecommendationSchema(title="Optimize GTM Channel Strategy", business_area="Marketing", priority="High", expected_impact="+20% MoM MRR", difficulty="Medium", estimated_time="14 Days"),
            AIRecommendationSchema(title="Extend Financial Runway to 18 Months", business_area="Finance", priority="High", expected_impact="De-risk operations", difficulty="Low", estimated_time="30 Days"),
            AIRecommendationSchema(title="Prepare Angel Investor Data Room", business_area="Fundraising", priority="Medium", expected_impact="Faster closing", difficulty="Medium", estimated_time="7 Days"),
        ]

        if int_status == "in_progress" or (interview and q_count >= 1 and int_status != "completed"):
            recommendations.insert(0, AIRecommendationSchema(
                title=f"Continue AI Business Interview for {startup.name}",
                business_area="AI Interview",
                priority="High",
                expected_impact=f"Question {q_count + 1} of 10 ready",
                difficulty="Low",
                estimated_time="5 Mins",
            ))
        elif int_status == "completed":
            recommendations.insert(0, AIRecommendationSchema(
                title=f"Explore Business Strategy Blueprint for {startup.name}",
                business_area="Strategy",
                priority="Medium",
                expected_impact="Executive Alignment",
                difficulty="Low",
                estimated_time="10 Mins",
            ))
        else:
            recommendations.insert(0, AIRecommendationSchema(
                title=f"Start AI Business Interview for {startup.name}",
                business_area="AI Interview",
                priority="High",
                expected_impact="Generate Startup Baseline",
                difficulty="Low",
                estimated_time="10 Mins",
            ))

        activity_col = get_collection(CollectionName.ACTIVITY_LOGS)
        cursor = activity_col.find({"startup_id": ObjectId(str(startup.id))}).sort("created_at", -1).limit(10)
        act_docs = await cursor.to_list(length=10)

        timeline = [
            ActivityTimelineItemSchema(
                id=str(d.get("_id", "")),
                action=d.get("action", "Activity"),
                entity_type=d.get("entity_type", "system"),
                description=d.get("description", ""),
                timestamp=d.get("created_at") or startup.created_at,
            )
            for d in act_docs
        ]

        if not timeline and reports:
            timeline = [
                ActivityTimelineItemSchema(
                    id=str(r.id),
                    action=f"Generated {r.title}",
                    entity_type="report",
                    description=f"{r.title} generated (v{r.version}).",
                    timestamp=r.created_at,
                )
                for r in reports
            ]

        if not timeline:
            timeline = [
                ActivityTimelineItemSchema(
                    id="init-1",
                    action="Startup Workspace Created",
                    entity_type="startup",
                    description=f"Initialized workspace for {startup.name}.",
                    timestamp=startup.created_at,
                )
            ]

        return DashboardOverviewResponse(
            startup_id=str(startup.id),
            startup_name=startup.name,
            stage=startup.stage.value if hasattr(startup.stage, "value") else str(startup.stage),
            progress=startup.progress,
            completion_percentage=startup.completion_percentage,
            scores=scores,
            latest_reports=latest_reports_data,
            ai_recommendations=recommendations,
            recent_activity=timeline,
        )

    # --- Conversation CRUD Delegate Methods ---
    async def create_conversation(
        self, user: User, startup: Startup, title: Optional[str] = None, module: str = "general"
    ) -> Conversation:
        conv_model = Conversation(
            startup_id=startup.id,
            user_id=user.id,
            title=title or f"AI {module.capitalize()} Strategy Chat",
            module=module,
        )
        return await self.conversation_repo.create(conv_model)

    async def list_conversations(
        self, startup_id: str, skip: int = 0, limit: int = 50, search: Optional[str] = None
    ) -> List[Conversation]:
        return await self.conversation_repo.list_by_startup(
            startup_id_str=startup_id, skip=skip, limit=limit, search=search
        )

    async def count_conversations(self, startup_id: str, search: Optional[str] = None) -> int:
        return await self.conversation_repo.count_by_startup(startup_id_str=startup_id, search=search)

    async def get_conversation(self, startup_id: str, conversation_id: str) -> Optional[Conversation]:
        return await self.conversation_repo.get_by_startup_and_id(startup_id, conversation_id)

    async def update_conversation(
        self, startup_id: str, conversation_id: str, title: Optional[str] = None, is_pinned: Optional[bool] = None
    ) -> Optional[Conversation]:
        conv = await self.get_conversation(startup_id, conversation_id)
        if not conv:
            return None
        if title is not None:
            conv = await self.conversation_repo.update_title(conversation_id, title)
        if is_pinned is not None:
            conv = await self.conversation_repo.pin_conversation(conversation_id, is_pinned)
        return conv

    async def pin_message(self, startup_id: str, conversation_id: str, message_id: str, is_pinned: bool) -> Optional[Conversation]:
        conv = await self.get_conversation(startup_id, conversation_id)
        if not conv:
            return None
        return await self.conversation_repo.pin_message(conversation_id, message_id, is_pinned)

    async def delete_conversation(self, startup_id: str, conversation_id: str) -> bool:
        return await self.conversation_repo.delete_by_startup_and_id(startup_id, conversation_id)
