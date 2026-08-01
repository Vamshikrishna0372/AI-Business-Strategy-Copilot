"""AI Context Builder for startup workspace data aggregation and isolation."""

import logging
from typing import Any, Dict, List, Optional
from app.models.startup import Startup
from app.models.user import User

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Aggregates and formats startup workspace context for AI prompts."""

    @classmethod
    def build_startup_context(
        cls,
        startup: Startup,
        user: Optional[User] = None,
        interview_data: Optional[Dict[str, Any]] = None,
        reports_summary: Optional[List[Dict[str, Any]]] = None,
        recent_messages: Optional[List[Dict[str, Any]]] = None,
        current_module: str = "general",
    ) -> str:
        """Assembles isolated startup workspace context into a clean text block."""
        context_parts = []

        # 1. Startup Workspace Profile Section
        context_parts.append("=== STARTUP WORKSPACE PROFILE ===")
        context_parts.append(f"Startup ID: {startup.id}")
        context_parts.append(f"Name: {startup.name}")
        if startup.tagline:
            context_parts.append(f"Tagline: {startup.tagline}")
        context_parts.append(f"Industry: {startup.industry or 'Not specified'}")
        context_parts.append(f"Lifecycle Stage: {startup.stage.value if hasattr(startup.stage, 'value') else startup.stage}")
        if startup.problem_statement:
            context_parts.append(f"Problem Statement: {startup.problem_statement}")
        if startup.solution:
            context_parts.append(f"Solution: {startup.solution}")
        if startup.target_audience:
            context_parts.append(f"Target Audience: {startup.target_audience}")
        if startup.business_model:
            context_parts.append(f"Business Model: {startup.business_model}")
        if startup.revenue_model:
            context_parts.append(f"Revenue Model: {startup.revenue_model}")
        if startup.description:
            context_parts.append(f"Description: {startup.description}")

        # 2. Founder / User Information Section
        if user:
            context_parts.append("\n=== FOUNDER / USER PROFILE ===")
            context_parts.append(f"Founder Name: {user.full_name}")
            context_parts.append(f"Email: {user.email}")
            context_parts.append(f"Role: {user.role.value if hasattr(user.role, 'value') else user.role}")

        # 3. AI Diagnostic Interview Answers Section
        if interview_data:
            context_parts.append("\n=== AI INTERVIEW INSIGHTS & ANSWERS ===")
            summary = interview_data.get("summary")
            if summary:
                context_parts.append(f"Interview Summary: {summary}")
            qa_list = interview_data.get("qa_history") or []
            if qa_list:
                context_parts.append("Key Q&A Highlights:")
                for idx, qa in enumerate(qa_list[:5], 1):
                    q = qa.get("question", "")
                    a = qa.get("answer", "No answer provided")
                    context_parts.append(f"  Q{idx}: {q}\n  A{idx}: {a}")

        # 4. Existing Strategy Reports Section
        if reports_summary:
            context_parts.append("\n=== EXISTING STRATEGY REPORTS ===")
            for r in reports_summary[:3]:
                title = r.get("title", "Report")
                rtype = r.get("report_type", "General")
                context_parts.append(f"- [{rtype}] {title}")

        # 5. Recent Conversation Memory Section
        if recent_messages:
            context_parts.append("\n=== RECENT CONVERSATION HISTORY ===")
            for msg in recent_messages[-6:]:
                sender = msg.get("sender", "user").capitalize()
                content = msg.get("content", "")
                # Truncate very long past messages to keep token usage efficient
                if len(content) > 300:
                    content = content[:300] + "..."
                context_parts.append(f"{sender}: {content}")

        # 6. Current Active Strategy Module Tag
        context_parts.append(f"\n=== CURRENT ACTIVE MODULE: {current_module.upper()} ===")

        return "\n".join(context_parts)
