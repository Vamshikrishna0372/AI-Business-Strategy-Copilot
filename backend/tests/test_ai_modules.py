"""Phase 3 Complete AI Modules Integration Tests."""

import uuid
import pytest
from httpx import AsyncClient
from tests.conftest import TEST_GOOGLE_TOKEN


async def _get_auth_and_startup(client: AsyncClient):
    """Authenticate and create a fresh startup workspace, returning headers and startup_id."""
    login = await client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    assert login.status_code == 200, f"Login failed: {login.text}"
    access_token = login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    unique_name = f"AI Strategy Corp {uuid.uuid4().hex[:6]}"
    create_res = await client.post(
        "/api/v1/startups",
        headers=headers,
        json={
            "name": unique_name,
            "industry": "AI SaaS",
            "stage": "idea",
            "problem_statement": "Founders lack structured strategy tools",
            "solution": "AI-powered Business Strategy Copilot",
            "target_audience": "Early-stage startup founders",
            "business_model": "B2B SaaS",
            "revenue_model": "Subscription",
        },
    )
    assert create_res.status_code == 201
    startup_id = create_res.json()["data"]["id"]
    headers["X-Startup-ID"] = startup_id
    return headers, startup_id


# --- MODULE 1: AI BUSINESS INTERVIEW ---

@pytest.mark.asyncio
async def test_interview_start(async_client: AsyncClient):
    """Start a new AI interview session and receive first dynamic question."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})
    assert res.status_code == 200
    data = res.json()["data"]
    assert "interview_id" in data
    assert "next_question" in data
    assert data["completed"] is False
    assert data["status"] in ["in_progress", "started", "resumed"]


@pytest.mark.asyncio
async def test_interview_answer(async_client: AsyncClient):
    """Submit answer to interview question and receive next question."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    # Start first
    start_res = await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})
    interview_id = start_res.json()["data"]["interview_id"]
    q_id = start_res.json()["data"]["next_question_id"]
    q_text = start_res.json()["data"]["next_question"]

    # Submit answer
    answer_res = await async_client.post(
        "/api/v1/ai/interview/answer",
        headers=headers,
        json={"question_id": q_id, "question": q_text, "answer": "We are ex-McKinsey consultants with deep startup expertise.", "category": "Founder Information"},
    )
    assert answer_res.status_code == 200
    data = answer_res.json()["data"]
    assert "next_question" in data
    assert len(data["qa_history"]) >= 1


@pytest.mark.asyncio
async def test_interview_complete(async_client: AsyncClient):
    """Complete interview and receive versioned executive summary report."""
    headers, startup_id = await _get_auth_and_startup(async_client)

    # Start interview
    start_res = await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})
    q_id = start_res.json()["data"]["next_question_id"]
    q_text = start_res.json()["data"]["next_question"]

    # Submit one answer
    await async_client.post(
        "/api/v1/ai/interview/answer",
        headers=headers,
        json={"question_id": q_id, "question": q_text, "answer": "We are building AI-powered strategy automation for startup founders.", "category": "Startup Basics"},
    )

    # Complete
    complete_res = await async_client.post("/api/v1/ai/interview/complete", headers=headers)
    assert complete_res.status_code == 200
    data = complete_res.json()["data"]
    assert "id" in data
    assert data["version"] >= 1
    assert "interview" in data["report_type"] or data["content"] is not None


@pytest.mark.asyncio
async def test_get_interview_details(async_client: AsyncClient):
    """Retrieve current interview details by startupId."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})

    res = await async_client.get(f"/api/v1/ai/interview/{startup_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["startup_id"] == startup_id


@pytest.mark.asyncio
async def test_interview_pause_and_resume(async_client: AsyncClient):
    """Test pausing and resuming an active AI interview session."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})

    # Pause
    pause_res = await async_client.post("/api/v1/ai/interview/pause", headers=headers, json={})
    assert pause_res.status_code == 200
    assert pause_res.json()["data"]["status"] == "paused"

    # Resume
    resume_res = await async_client.post("/api/v1/ai/interview/resume", headers=headers, json={})
    assert resume_res.status_code == 200
    assert resume_res.json()["data"]["status"] in ["started", "in_progress", "resumed"]


@pytest.mark.asyncio
async def test_interview_stop_and_restart(async_client: AsyncClient):
    """Test stopping and restarting an interview session cleanly."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    start_res = await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})
    q_id = start_res.json()["data"]["next_question_id"]
    q_text = start_res.json()["data"]["next_question"]

    # Submit answer
    await async_client.post(
        "/api/v1/ai/interview/answer",
        headers=headers,
        json={"question_id": q_id, "question": q_text, "answer": "We focus on enterprise AI strategy automation.", "category": "General"},
    )

    # Stop
    stop_res = await async_client.post("/api/v1/ai/interview/stop", headers=headers, json={})
    assert stop_res.status_code == 200

    # Restart
    restart_res = await async_client.post("/api/v1/ai/interview/restart", headers=headers, json={"confirm": True})
    assert restart_res.status_code == 200
    assert restart_res.json()["data"]["current_question_number"] == 1


@pytest.mark.asyncio
async def test_get_business_knowledge(async_client: AsyncClient):
    """Test fetching structured Business Knowledge Base from interview."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})

    res = await async_client.get(f"/api/v1/ai/interview/{startup_id}/knowledge", headers=headers)
    assert res.status_code == 200
    assert "knowledge" in res.json()["data"]



# --- MODULE 2: IDEA VALIDATION ---

@pytest.mark.asyncio
async def test_idea_validation(async_client: AsyncClient):
    """Generate idea validation score and category breakdown."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/idea-validation", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["version"] >= 1
    assert data["report_type"] == "idea_validation"
    assert isinstance(data["content"], dict)


# --- MODULE 3: BUSINESS STRATEGY ---

@pytest.mark.asyncio
async def test_business_strategy(async_client: AsyncClient):
    """Generate complete business strategy blueprint."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/business-strategy", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "business_strategy"
    assert data["version"] >= 1


# --- MODULE 4: COMPETITOR INTELLIGENCE ---

@pytest.mark.asyncio
async def test_competitor_analysis(async_client: AsyncClient):
    """Generate competitor intelligence and SWOT matrix."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/competitor-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "competitor_analysis"


# --- MODULE 5: BUSINESS MODEL CANVAS ---

@pytest.mark.asyncio
async def test_business_model_canvas(async_client: AsyncClient):
    """Generate 9-block Business Model Canvas."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/business-model-canvas", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "business_model_canvas"


# --- MODULE 6: FINANCIAL PLANNING ENGINE ---

@pytest.mark.asyncio
async def test_financial_planning(async_client: AsyncClient):
    """Generate financial forecast and runway model."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/financial-planning", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "financial_planning"


# --- MODULE 7: RISK INTELLIGENCE ---

@pytest.mark.asyncio
async def test_risk_analysis(async_client: AsyncClient):
    """Generate risk intelligence matrix across 10 categories."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/risk-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "risk_analysis"


# --- MODULE 8: INVESTOR READINESS ---

@pytest.mark.asyncio
async def test_investor_readiness(async_client: AsyncClient):
    """Generate investor readiness evaluation and pitch deck outlines."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/investor-readiness", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "investor_readiness"


# --- MODULE 9: EXECUTION ROADMAP ---

@pytest.mark.asyncio
async def test_execution_roadmap(async_client: AsyncClient):
    """Generate strategic execution roadmap with milestones and KPIs."""
    headers, _ = await _get_auth_and_startup(async_client)
    res = await async_client.post("/api/v1/ai/execution-roadmap", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "id" in data
    assert data["report_type"] == "execution_roadmap"


# --- REPORT MANAGEMENT & VERSIONING ---

@pytest.mark.asyncio
async def test_report_versioning(async_client: AsyncClient):
    """Generate a report, regenerate it, and verify version increments (v1 → v2)."""
    headers, _ = await _get_auth_and_startup(async_client)

    # Generate v1
    res1 = await async_client.post("/api/v1/ai/business-strategy", headers=headers)
    assert res1.status_code == 200
    v1 = res1.json()["data"]["version"]

    # Regenerate → v2
    res2 = await async_client.post(
        "/api/v1/reports/regenerate",
        headers=headers,
        json={"report_type": "business_strategy", "custom_instructions": "Focus on international expansion strategy."},
    )
    assert res2.status_code == 200
    v2 = res2.json()["data"]["version"]
    assert v2 == v1 + 1


@pytest.mark.asyncio
async def test_list_and_get_reports(async_client: AsyncClient):
    """List all reports and retrieve one by ID."""
    headers, _ = await _get_auth_and_startup(async_client)

    # Generate one report
    gen_res = await async_client.post("/api/v1/ai/idea-validation", headers=headers)
    report_id = gen_res.json()["data"]["id"]

    # List reports
    list_res = await async_client.get("/api/v1/reports", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    # Get by ID
    get_res = await async_client.get(f"/api/v1/reports/{report_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == report_id


# --- DASHBOARD & BUSINESS SCORING ---

@pytest.mark.asyncio
async def test_executive_dashboard(async_client: AsyncClient):
    """Retrieve executive dashboard overview with scores and recommendations."""
    headers, startup_id = await _get_auth_and_startup(async_client)

    # Generate at least one report to seed the dashboard
    await async_client.post("/api/v1/ai/business-strategy", headers=headers)

    res = await async_client.get("/api/v1/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "startup_id" in data
    assert "scores" in data
    assert data["scores"]["overall_startup_score"]["value"] >= 0


@pytest.mark.asyncio
async def test_startup_scores(async_client: AsyncClient):
    """Retrieve multi-dimensional business scoring metrics."""
    headers, startup_id = await _get_auth_and_startup(async_client)
    res = await async_client.get(f"/api/v1/startup/{startup_id}/scores", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "overall_startup_score" in data
    assert "business_health" in data
    assert "innovation_score" in data
    assert "investor_readiness" in data


@pytest.mark.asyncio
async def test_startup_timeline(async_client: AsyncClient):
    """Retrieve startup activity timeline."""
    headers, startup_id = await _get_auth_and_startup(async_client)

    # Create an activity first
    await async_client.post("/api/v1/ai/interview/start", headers=headers, json={})

    res = await async_client.get(f"/api/v1/startup/{startup_id}/timeline", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)
