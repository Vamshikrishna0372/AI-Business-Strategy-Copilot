"""Phase 2 - Authentication Endpoint Tests."""

from httpx import AsyncClient
from tests.conftest import TEST_GOOGLE_TOKEN, TEST_GOOGLE_TOKEN_B


async def test_health_check(async_client: AsyncClient):
    """Health check is still accessible after Phase 2."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["app_name"] == "AI Business Strategy Copilot"


async def test_google_login_creates_user(async_client: AsyncClient):
    """Google OAuth login creates new user and returns JWT tokens."""
    response = await async_client.post(
        "/api/v1/auth/google",
        json={"id_token": TEST_GOOGLE_TOKEN},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    assert "user" in data["data"]
    assert data["data"]["user"]["email"] == "founder01@example.com"
    assert data["data"]["user"]["role"] == "founder"


async def test_google_login_idempotent(async_client: AsyncClient):
    """Repeated Google login for same user returns valid tokens without duplication."""
    r1 = await async_client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    r2 = await async_client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["data"]["user"]["email"] == r2.json()["data"]["user"]["email"]


async def test_google_login_invalid_token(async_client: AsyncClient):
    """Invalid Google token returns 401 unauthorized."""
    response = await async_client.post(
        "/api/v1/auth/google",
        json={"id_token": "not-a-valid-google-token-at-all"},
    )
    assert response.status_code == 401


async def test_get_me_requires_auth(async_client: AsyncClient):
    """/auth/me returns 401 without Authorization header."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_get_me_with_valid_token(async_client: AsyncClient):
    """Authenticated /auth/me returns current user profile."""
    login = await async_client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    token = login.json()["data"]["access_token"]

    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "founder01@example.com"


async def test_refresh_token(async_client: AsyncClient):
    """Valid refresh token issues new access + refresh token pair."""
    login = await async_client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    refresh_token = login.json()["data"]["refresh_token"]

    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()["data"]


async def test_refresh_token_invalid(async_client: AsyncClient):
    """Malformed refresh token returns 401."""
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "not.a.valid.token"},
    )
    assert response.status_code == 401


async def test_logout_authenticated(async_client: AsyncClient):
    """Authenticated logout returns success response."""
    login = await async_client.post("/api/v1/auth/google", json={"id_token": TEST_GOOGLE_TOKEN})
    token = login.json()["data"]["access_token"]

    response = await async_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


async def test_logout_unauthenticated(async_client: AsyncClient):
    """Logout without token returns 401."""
    response = await async_client.post("/api/v1/auth/logout")
    assert response.status_code == 401
