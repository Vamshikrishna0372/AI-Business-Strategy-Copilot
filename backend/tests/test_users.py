"""Phase 2 - User Profile & Preferences Endpoint Tests."""

from httpx import AsyncClient
from tests.conftest import TEST_GOOGLE_TOKEN


async def _get_auth_header(client: AsyncClient, token: str = TEST_GOOGLE_TOKEN) -> dict:
    login = await client.post("/api/v1/auth/google", json={"id_token": token})
    assert login.status_code == 200, f"Login failed: {login.text}"
    return {"Authorization": f"Bearer {login.json()['data']['access_token']}"}


async def test_get_profile(async_client: AsyncClient):
    """Authenticated user can retrieve their profile."""
    headers = await _get_auth_header(async_client)
    response = await async_client.get("/api/v1/users/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "founder01@example.com"
    assert "preferences" in data
    assert "timezone" in data


async def test_get_profile_unauthenticated(async_client: AsyncClient):
    """Unauthenticated profile request returns 401."""
    response = await async_client.get("/api/v1/users/profile")
    assert response.status_code == 401


async def test_update_profile_name_and_timezone(async_client: AsyncClient):
    """Authenticated user can update full name and timezone."""
    headers = await _get_auth_header(async_client)
    response = await async_client.put(
        "/api/v1/users/profile",
        headers=headers,
        json={"full_name": "Vamshi Copilot Founder", "timezone": "Asia/Kolkata"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["full_name"] == "Vamshi Copilot Founder"
    assert data["timezone"] == "Asia/Kolkata"


async def test_update_profile_partial(async_client: AsyncClient):
    """Partial profile update only changes specified fields."""
    headers = await _get_auth_header(async_client)
    response = await async_client.put(
        "/api/v1/users/profile",
        headers=headers,
        json={"full_name": "Partial Name Update"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["full_name"] == "Partial Name Update"


async def test_update_preferences_theme(async_client: AsyncClient):
    """Authenticated user can update theme preference."""
    headers = await _get_auth_header(async_client)
    response = await async_client.patch(
        "/api/v1/users/preferences",
        headers=headers,
        json={"theme": "light"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["preferences"]["theme"] == "light"


async def test_update_preferences_notifications(async_client: AsyncClient):
    """Authenticated user can toggle notification preference."""
    headers = await _get_auth_header(async_client)
    response = await async_client.patch(
        "/api/v1/users/preferences",
        headers=headers,
        json={"notifications_enabled": False},
    )
    assert response.status_code == 200
    assert response.json()["data"]["preferences"]["notifications_enabled"] is False


async def test_update_preferences_unauthenticated(async_client: AsyncClient):
    """Unauthenticated preferences update returns 401."""
    response = await async_client.patch(
        "/api/v1/users/preferences",
        json={"theme": "dark"},
    )
    assert response.status_code == 401
