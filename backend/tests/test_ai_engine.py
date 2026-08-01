"""Phase 3 - Comprehensive AI Engine & Architecture Tests."""

import uuid
import pytest
from httpx import AsyncClient
from app.ai.base import BaseAIProvider
from app.ai.context_builder import ContextBuilder
from app.ai.fallback import FallbackAIProvider
from app.ai.prompt_engine import PromptEngine
from app.ai.validator import AIResponseValidator
from app.middleware.rate_limiter import AIRateLimiter
from app.models.conversation import ChatMessage, Conversation
from app.models.startup import Startup
from app.models.user import User
from app.repositories.conversation_repository import ConversationRepository
from tests.conftest import TEST_GOOGLE_TOKEN


# --- Unit Tests: Response Validator ---
def test_ai_response_validator_cleaning_and_repair():
    """AIResponseValidator handles raw strings, markdown JSON blocks, and missing keys."""
    # 1. Markdown code block
    raw_markdown = '```json\n{"success": true, "message": "Ok", "data": {"key": "val"}}\n```'
    parsed = AIResponseValidator.parse_and_repair_json(raw_markdown)
    assert parsed["success"] is True
    assert parsed["message"] == "Ok"
    assert parsed["data"]["key"] == "val"

    # 2. Trailing comma in JSON string
    raw_trailing = '{"message": "Test", "confidence": 0.9,}'
    parsed2 = AIResponseValidator.parse_and_repair_json(raw_trailing)
    assert parsed2["success"] is True
    assert parsed2["message"] == "Test"

    # 3. Raw text fallback
    parsed3 = AIResponseValidator.parse_and_repair_json("Plain text response from AI")
    assert parsed3["success"] is False
    assert "data" in parsed3


# --- Unit Tests: Prompt Engine ---
def test_prompt_engine_templates():
    """PromptEngine formats system role and module prompts correctly."""
    engine = PromptEngine()

    sys_prompt, user_prompt = engine.render_prompt(
        module="business_strategy",
        context="Startup: Acme AI",
        query="What is our GTM strategy?",
    )
    assert "AI Business Strategy Copilot" in sys_prompt
    assert "Startup: Acme AI" in user_prompt
    assert "What is our GTM strategy?" in user_prompt

    # Unknown module fallback to general
    sys_unknown, user_unknown = engine.render_prompt(
        module="non_existent_module",
        context="Ctx",
        query="Q",
    )
    assert "General AI Strategy Copilot Chat" in user_unknown


# --- Unit Tests: Context Builder ---
def test_context_builder_isolation():
    """ContextBuilder formats isolated startup workspace profile and history."""
    from bson import ObjectId
    startup = Startup(
        id=ObjectId(),
        owner_id=ObjectId(),
        name="TechNova Labs",
        slug="technova-labs",
        industry="AI & Robotics",
        problem_statement="High manual inspection costs",
        solution="Autonomous drone computer vision",
    )

    ctx_str = ContextBuilder.build_startup_context(
        startup=startup,
        current_module="idea_validation",
    )
    assert "TechNova Labs" in ctx_str
    assert "AI & Robotics" in ctx_str
    assert "High manual inspection costs" in ctx_str
    assert "Autonomous drone computer vision" in ctx_str
    assert "IDEA_VALIDATION" in ctx_str


# --- Unit Tests: Fallback AI Provider ---
class MockSuccessProvider(BaseAIProvider):
    @property
    def provider_name(self) -> str:
        return "mock_primary"

    @property
    def model_name(self) -> str:
        return "mock_model_1"

    async def generate_completion(self, prompt: str, system_prompt=None, temperature=None, max_tokens=None) -> str:
        return "Primary provider response"

    async def generate_structured_json(self, prompt: str, schema=None, system_prompt=None, temperature=None, max_tokens=None):
        return {"success": True, "message": "Primary structured response"}

    async def health_check(self) -> bool:
        return True


class MockFailingProvider(BaseAIProvider):
    @property
    def provider_name(self) -> str:
        return "mock_failing"

    @property
    def model_name(self) -> str:
        return "mock_failing_model"

    async def generate_completion(self, prompt: str, system_prompt=None, temperature=None, max_tokens=None) -> str:
        raise RuntimeError("Primary provider down")

    async def generate_structured_json(self, prompt: str, schema=None, system_prompt=None, temperature=None, max_tokens=None):
        raise RuntimeError("Primary provider rate limited")

    async def health_check(self) -> bool:
        return False


@pytest.mark.asyncio
async def test_fallback_ai_provider_failover():
    """FallbackAIProvider switches to secondary provider when primary fails."""
    primary_fail = MockFailingProvider()
    secondary_ok = MockSuccessProvider()

    fallback_layer = FallbackAIProvider(
        primary_provider=primary_fail,
        fallback_provider=secondary_ok,
    )

    res = await fallback_layer.generate_structured_json("Test prompt")
    assert res["success"] is True
    assert res["metadata"]["provider_used"] == "mock_primary"  # from mock success provider name
    assert res["metadata"]["fallback_triggered"] is True


# --- Unit Tests: AIRateLimiter ---
def test_ai_rate_limiter():
    """AIRateLimiter raises 429 when request threshold per minute is exceeded."""
    limiter = AIRateLimiter(requests_per_minute=2)
    user_id = "user_123"
    startup_id = "startup_456"

    limiter.check_rate_limit(user_id, startup_id)
    limiter.check_rate_limit(user_id, startup_id)

    with pytest.raises(Exception) as exc_info:
        limiter.check_rate_limit(user_id, startup_id)
    assert "429" in str(exc_info.value.status_code)


# --- Integration Tests: API Endpoints ---
async def _get_auth_header_and_startup(client: AsyncClient):
    login = await client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    access_token = login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    unique_name = f"AI Startup {uuid.uuid4().hex[:6]}"
    create_res = await client.post(
        "/api/v1/startups",
        headers=headers,
        json={"name": unique_name, "industry": "Artificial Intelligence", "stage": "idea"},
    )
    startup_id = create_res.json()["data"]["id"]
    headers["X-Startup-ID"] = startup_id
    return headers, startup_id


@pytest.mark.asyncio
async def test_chat_conversations_api_flow(async_client: AsyncClient):
    """Full lifecycle test for AI Chat Conversations API endpoints."""
    headers, startup_id = await _get_auth_header_and_startup(async_client)

    # 1. Create Conversation
    create_res = await async_client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "Strategy Discussion", "module": "business_strategy"},
    )
    assert create_res.status_code == 201
    conv_data = create_res.json()["data"]
    conv_id = conv_data["id"]
    assert conv_data["title"] == "Strategy Discussion"
    assert conv_data["startup_id"] == startup_id

    # 2. List Conversations
    list_res = await async_client.get("/api/v1/chat/conversations", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    # 3. Get Conversation Details
    get_res = await async_client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == conv_id

    # 4. Send Chat Message to AI Engine
    msg_res = await async_client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=headers,
        json={"content": "What are our top 3 growth tactics?", "module": "business_strategy"},
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()["data"]
    assert "assistant_message" in msg_data
    assert len(msg_data["conversation"]["messages"]) >= 2

    # 5. Rename & Pin Conversation
    update_res = await async_client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Updated Strategy Discussion", "is_pinned": True},
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["title"] == "Updated Strategy Discussion"
    assert update_res.json()["data"]["is_pinned"] is True

    # 6. Delete Conversation
    del_res = await async_client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["data"] is True


@pytest.mark.asyncio
async def test_ai_generate_and_health_api(async_client: AsyncClient):
    """Test direct AI generation and health check API endpoints."""
    headers, startup_id = await _get_auth_header_and_startup(async_client)

    # 1. AI Health Check
    health_res = await async_client.get("/api/v1/ai/health", headers=headers)
    assert health_res.status_code == 200
    assert "primary_provider" in health_res.json()["data"]

    # 2. AI Direct Generation
    gen_res = await async_client.post(
        "/api/v1/ai/generate",
        headers=headers,
        json={"module": "idea_validation", "prompt": "Validate an AI SaaS for legal contract summary."},
    )
    assert gen_res.status_code == 200
    gen_data = gen_res.json()["data"]
    assert "success" in gen_data
