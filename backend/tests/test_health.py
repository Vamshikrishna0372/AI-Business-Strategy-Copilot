"""Phase 1 – Health check endpoint test."""

from httpx import AsyncClient


async def test_health_check_endpoint(async_client: AsyncClient):
    """Health check route returns expected response structure."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "data" in data
    assert data["data"]["app_name"] == "AI Business Strategy Copilot"
    assert "services" in data["data"]
    assert data["data"]["database"] == "connected"
