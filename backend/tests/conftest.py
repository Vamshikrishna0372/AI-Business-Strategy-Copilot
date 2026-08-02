"""Test Configuration and Fixtures for AI Business Strategy Copilot – Phase 3.

Uses mongomock-motor for fully in-memory MongoDB so no real Atlas connection is needed.
Google OAuth test tokens (test_google_token_*) are handled natively by the app when DEBUG=True.
Tavily is mocked to prevent real HTTP network calls during testing.
"""

import pytest_asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
import mongomock_motor


TEST_GOOGLE_TOKEN = "test_google_token_founder01"
TEST_GOOGLE_TOKEN_B = "test_google_token_founderB"


@pytest_asyncio.fixture(autouse=True)
async def mock_db_and_external_services():
    """
    Autouse fixture that:
    1. Replaces DatabaseManager with an in-memory mongomock-motor client per test.
    2. Patches Tavily search to avoid real HTTP calls.
    3. Stubs DB connect/close/ping to no-ops.
    """
    # Create fresh in-memory Motor-compatible client for each test
    mock_client = mongomock_motor.AsyncMongoMockClient()
    mock_db = mock_client["ai_strategy_copilot_test"]

    # Patch DatabaseManager class methods
    from app.database import connection as db_conn

    db_conn.DatabaseManager.get_database = classmethod(lambda cls: mock_db)
    db_conn.DatabaseManager.connect_to_database = AsyncMock(return_value=None)
    db_conn.DatabaseManager.close_database_connection = AsyncMock(return_value=None)
    db_conn.DatabaseManager.ping_health = AsyncMock(return_value=True)

    # Patch Tavily to never make real network calls
    async def _mock_tavily_search(self, query: str, *args, **kwargs):
        return {
            "results": [
                {
                    "title": "Mock Market Intelligence Result",
                    "url": "https://example.com/mock",
                    "content": "Mock competitive research result for unit testing purposes.",
                }
            ]
        }

    async def _mock_tavily_validate(self):
        return True

    with (
        patch("app.services.tavily_service.TavilyService.search", _mock_tavily_search),
        patch("app.services.tavily_service.TavilyService.validate_key", _mock_tavily_validate),
    ):
        yield


@pytest_asyncio.fixture
async def async_client(mock_db_and_external_services) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client bound to the in-memory mocked FastAPI app."""
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


