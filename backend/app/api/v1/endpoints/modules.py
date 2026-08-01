"""AI Business Strategy Modules API Router (Modules 1-9)."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status
from app.common.responses import ResponseModel
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_active_startup, get_current_user
from app.middleware.rate_limiter import ai_rate_limiter
from app.models.startup import Startup
from app.models.user import User
from app.schemas.interview import (
    InterviewResponse,
    InterviewStepResponse,
    QAPairSchema,
    StartInterviewRequest,
    SubmitAnswerRequest,
)
from app.schemas.reports_schema import ReportResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Business Modules"])
ai_service = AIService()


def _map_report_to_response(report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        startup_id=str(report.startup_id),
        user_id=str(report.user_id),
        report_type=report.report_type.value if hasattr(report.report_type, "value") else str(report.report_type),
        title=report.title,
        version=report.version,
        status=report.status,
        ai_provider=report.ai_provider,
        confidence=report.confidence,
        content=report.content,
        conversation_id=str(report.conversation_id) if report.conversation_id else None,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


# --- MODULE 1: AI BUSINESS INTERVIEW ENDPOINTS ---
@router.post(
    "/interview/start",
    response_model=ResponseModel[InterviewStepResponse],
    status_code=status.HTTP_200_OK,
    summary="Start AI Business Interview Session",
)
async def start_interview(
    body: Optional[StartInterviewRequest] = None,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Starts or fetches current active AI interview step for active startup."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    notes = body.initial_notes if body else None
    res = await ai_service.start_interview(user=current_user, startup=current_startup, initial_notes=notes)
    return ResponseModel(success=True, message="AI Interview step initialized", data=res)


@router.post(
    "/interview/answer",
    response_model=ResponseModel[InterviewStepResponse],
    status_code=status.HTTP_200_OK,
    summary="Submit Answer & Get Next Question",
)
async def submit_interview_answer(
    body: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Records founder answer and dynamically generates the next interview question."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    res = await ai_service.submit_interview_answer(
        user=current_user,
        startup=current_startup,
        question_id=body.question_id,
        question=body.question,
        answer=body.answer,
        category=body.category,
    )
    return ResponseModel(success=True, message="Interview answer recorded", data=res)


@router.post(
    "/interview/complete",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Complete Interview & Synthesize Executive Summary",
)
async def complete_interview(
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Completes interview session and synthesizes versioned executive summary report."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.complete_interview(user=current_user, startup=current_startup)
    return ResponseModel(success=True, message="AI Interview completed and summary generated", data=_map_report_to_response(report))


@router.get(
    "/interview/{startupId}",
    response_model=ResponseModel[InterviewResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Interview Details for Startup",
)
async def get_startup_interview(
    startupId: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Retrieves current interview state and Q&A history."""
    interview = await ai_service.interview_repo.get_latest_interview(startupId)
    if not interview:
        raise NotFoundException(f"No interview found for startup '{startupId}'")

    data = InterviewResponse(
        id=str(interview.id),
        startup_id=str(interview.startup_id),
        user_id=str(interview.user_id),
        title=interview.title,
        status=interview.status.value if hasattr(interview.status, "value") else str(interview.status),
        qa_history=[QAPairSchema(**qa) for qa in interview.qa_history],
        summary=interview.summary,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )
    return ResponseModel(success=True, message="Interview details retrieved", data=data)


# --- MODULE 2: IDEA VALIDATION ---
@router.post(
    "/idea-validation",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Execute Idea Validation Engine",
)
async def idea_validation(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates overall validation score, category breakdown, and strategic recommendation."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_idea_validation(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Idea validation report generated", data=_map_report_to_response(report))


# --- MODULE 3: BUSINESS STRATEGY ---
@router.post(
    "/business-strategy",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Comprehensive Business Strategy Blueprint",
)
async def business_strategy(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates full executive business strategy, persona, GTM, pricing, tech stack, and KPIs."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_business_strategy(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Business strategy blueprint generated", data=_map_report_to_response(report))


# --- MODULE 4: COMPETITOR INTELLIGENCE ---
@router.post(
    "/competitor-analysis",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Competitor Intelligence & SWOT Matrix",
)
async def competitor_analysis(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates competitor analysis, SWOT matrix, market gaps, and moat strategy."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_competitor_analysis(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Competitor intelligence report generated", data=_map_report_to_response(report))


# --- MODULE 5: BUSINESS MODEL CANVAS ---
@router.post(
    "/business-model-canvas",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate 9-Block Business Model Canvas",
)
async def business_model_canvas(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates the 9 core blocks of the Business Model Canvas (BMC)."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_business_model_canvas(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Business Model Canvas generated", data=_map_report_to_response(report))


# --- MODULE 6: FINANCIAL PLANNING ENGINE ---
@router.post(
    "/financial-planning",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Financial Forecast & Runway Model",
)
async def financial_planning(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates revenue/expense forecast, break-even analysis, runway, and funding allocation."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_financial_planning(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Financial planning model generated", data=_map_report_to_response(report))


# --- MODULE 7: RISK INTELLIGENCE ---
@router.post(
    "/risk-analysis",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Risk Intelligence & Mitigation Matrix",
)
async def risk_analysis(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Evaluates risk score and mitigation strategies across 10 business risk categories."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_risk_analysis(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Risk intelligence report generated", data=_map_report_to_response(report))


# --- MODULE 8: INVESTOR READINESS ---
@router.post(
    "/investor-readiness",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Investor Readiness & Pitch Deck Outlines",
)
async def investor_readiness(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Evaluates fundability, stage recommendation, pitch deck scripts, and investor checklist."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_investor_readiness(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Investor readiness report generated", data=_map_report_to_response(report))


# --- MODULE 9: EXECUTION ROADMAP ---
@router.post(
    "/execution-roadmap",
    response_model=ResponseModel[ReportResponse],
    status_code=status.HTTP_200_OK,
    summary="Generate Strategic Execution Roadmap",
)
async def execution_roadmap(
    prompt: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Generates phased milestone roadmap (weekly, monthly, quarterly) with KPIs and tasks."""
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))
    report = await ai_service.generate_execution_roadmap(user=current_user, startup=current_startup, prompt=prompt)
    return ResponseModel(success=True, message="Execution roadmap generated", data=_map_report_to_response(report))
