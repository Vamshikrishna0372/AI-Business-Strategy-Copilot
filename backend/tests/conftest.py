"""Test Configuration and Fixtures for AI Business Strategy Copilot – Phase 2."""

import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from app.main import app

TEST_GOOGLE_TOKEN = "test_google_token_founder01"
TEST_GOOGLE_TOKEN_B = "test_google_token_founderB"


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client executing inside FastAPI lifespan context manager."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
