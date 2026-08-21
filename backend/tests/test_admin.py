"""Admin Panel Integration Tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_login(async_client: AsyncClient):
    """Test admin login with seeded credentials admin@aibusinesscopilot.com / admin123."""
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@aibusinesscopilot.com", "password": "admin123"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "admin@aibusinesscopilot.com"


@pytest.mark.asyncio
async def test_admin_dashboard_stats(async_client: AsyncClient):
    """Test retrieving admin dashboard stats as an authenticated admin."""
    # Login admin
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@aibusinesscopilot.com", "password": "admin123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch stats
    stats_res = await async_client.get("/api/v1/admin/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    data = stats_res.json()["data"]
    assert "metrics" in data
    assert "total_users" in data["metrics"]
    assert "system_health" in data


@pytest.mark.asyncio
async def test_admin_rbac_protection(async_client: AsyncClient):
    """Test that normal founder users cannot access admin endpoints."""
    # Login normal founder
    founder_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "founder_test@example.com", "full_name": "Test Founder"},
    )
    assert founder_res.status_code == 200
    token = founder_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access admin dashboard stats
    forbidden_res = await async_client.get("/api/v1/admin/dashboard/stats", headers=headers)
    assert forbidden_res.status_code == 403
