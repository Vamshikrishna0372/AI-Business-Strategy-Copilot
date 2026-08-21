"""CORS Middleware Integration Tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cors_options_preflight(async_client: AsyncClient):
    """Verifies OPTIONS preflight request from Vercel frontend origin receives valid CORS headers."""
    vercel_origin = "https://ai-business-strategy-copilot.vercel.app"
    headers = {
        "Origin": vercel_origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, authorization, x-startup-id",
    }

    res = await async_client.options("/api/v1/auth/login", headers=headers)
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == vercel_origin
    assert res.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
async def test_cors_post_login_headers(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/login response contains CORS headers for Vercel origin."""
    vercel_origin = "https://ai-business-strategy-copilot.vercel.app"
    headers = {"Origin": vercel_origin}

    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@aibusinesscopilot.com", "password": "admin123"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == vercel_origin
    assert res.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
async def test_cors_preview_vercel_origin(async_client: AsyncClient):
    """Verifies Vercel preview deployment origins match regex and receive CORS headers."""
    preview_origin = "https://ai-business-strategy-copilot-git-main-test.vercel.app"
    headers = {
        "Origin": preview_origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }

    res = await async_client.options("/api/v1/auth/login", headers=headers)
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == preview_origin
