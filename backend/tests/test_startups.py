"""Phase 2 - Startup Workspace Endpoint Tests with Dynamic Test Names."""

import uuid
import pytest
from httpx import AsyncClient
from tests.conftest import TEST_GOOGLE_TOKEN, TEST_GOOGLE_TOKEN_B


async def _get_auth_header(client: AsyncClient, token: str = TEST_GOOGLE_TOKEN) -> dict:
    login = await client.post("/api/v1/auth/google", json={"id_token": token})
    assert login.status_code == 200, f"Login failed: {login.text}"
    access_token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


async def test_create_startup(async_client: AsyncClient):
    """Authenticated founder can create a startup workspace."""
    headers = await _get_auth_header(async_client)
    unique_name = f"EduTech Vision {uuid.uuid4().hex[:6]}"
    response = await async_client.post(
        "/api/v1/startups",
        headers=headers,
        json={
            "name": unique_name,
            "tagline": "Transforming learning with AI",
            "industry": "EdTech",
            "stage": "idea",
            "country": "India",
            "city": "Hyderabad",
            "problem_statement": "Students lack personalized learning paths",
            "solution": "AI-driven adaptive learning platform",
            "target_audience": "College students aged 18-25",
            "business_model": "B2C",
            "revenue_model": "Subscription",
        },
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == unique_name
    assert data["industry"] == "EdTech"
    assert data["stage"] == "idea"
    assert data["status"] == "active"
    assert data["owner_id"] is not None
    assert data["progress"] >= 0


async def test_create_startup_duplicate_name_same_user(async_client: AsyncClient):
    """Creating a second startup with the same name for same founder returns 400."""
    headers = await _get_auth_header(async_client)
    unique_name = f"DuplicateStartup {uuid.uuid4().hex[:6]}"
    payload = {"name": unique_name, "stage": "idea"}
    res1 = await async_client.post("/api/v1/startups", headers=headers, json=payload)
    assert res1.status_code == 201
    response = await async_client.post("/api/v1/startups", headers=headers, json=payload)
    assert response.status_code == 400


async def test_different_users_same_startup_name_allowed(async_client: AsyncClient):
    """Two different founders can each have a startup with the same name (workspace isolation)."""
    headers_a = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN)
    headers_b = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN_B)

    unique_name = f"SharedNameStartup {uuid.uuid4().hex[:6]}"
    payload = {"name": unique_name, "stage": "idea"}
    r_a = await async_client.post("/api/v1/startups", headers=headers_a, json=payload)
    r_b = await async_client.post("/api/v1/startups", headers=headers_b, json=payload)

    assert r_a.status_code == 201
    assert r_b.status_code == 201


async def test_list_startups(async_client: AsyncClient):
    """Founder can list their startup workspaces."""
    headers = await _get_auth_header(async_client)
    unique_name = f"List Test Startup {uuid.uuid4().hex[:6]}"
    await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "seed"})
    response = await async_client.get("/api/v1/startups", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    assert "meta" in body
    assert isinstance(body["data"], list)
    assert body["meta"]["total"] >= 1


async def test_list_startups_pagination(async_client: AsyncClient):
    """Startup list pagination returns correct metadata."""
    headers = await _get_auth_header(async_client)
    response = await async_client.get("/api/v1/startups?page=1&page_size=5", headers=headers)
    assert response.status_code == 200
    meta = response.json()["meta"]
    assert "total" in meta
    assert "total_pages" in meta
    assert "has_next" in meta
    assert "has_prev" in meta


async def test_list_startups_search(async_client: AsyncClient):
    """Search returns startups matching query string."""
    headers = await _get_auth_header(async_client)
    unique_name = f"SearchableUnique {uuid.uuid4().hex[:6]}"
    await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    response = await async_client.get(f"/api/v1/startups?search={unique_name}", headers=headers)
    assert response.status_code == 200
    items = response.json()["data"]
    assert any(unique_name in s["name"] for s in items)


async def test_list_startups_filter_by_stage(async_client: AsyncClient):
    """Startups can be filtered by stage."""
    headers = await _get_auth_header(async_client)
    unique_name = f"SeedStage {uuid.uuid4().hex[:6]}"
    await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "seed"})
    response = await async_client.get("/api/v1/startups?stage=seed", headers=headers)
    assert response.status_code == 200
    for s in response.json()["data"]:
        assert s["stage"] == "seed"


async def test_get_startup_by_id(async_client: AsyncClient):
    """Founder can retrieve their own startup by ID."""
    headers = await _get_auth_header(async_client)
    unique_name = f"FetchByID {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.get(f"/api/v1/startups/{startup_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["id"] == startup_id


async def test_get_startup_workspace_isolation(async_client: AsyncClient):
    """Founder B cannot access Founder A's startup workspace."""
    headers_a = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN)
    headers_b = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN_B)

    unique_name = f"PrivateStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers_a, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.get(f"/api/v1/startups/{startup_id}", headers=headers_b)
    assert response.status_code == 404


async def test_update_startup(async_client: AsyncClient):
    """Founder can update their startup fields."""
    headers = await _get_auth_header(async_client)
    unique_name = f"UpdateStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.put(
        f"/api/v1/startups/{startup_id}",
        headers=headers,
        json={"tagline": "Our new tagline!", "city": "Mumbai", "stage": "seed"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["tagline"] == "Our new tagline!"
    assert data["city"] == "Mumbai"
    assert data["stage"] == "seed"


async def test_archive_startup(async_client: AsyncClient):
    """Founder can archive an active startup."""
    headers = await _get_auth_header(async_client)
    unique_name = f"ArchiveStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.patch(f"/api/v1/startups/{startup_id}/archive", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "archived"


async def test_restore_startup(async_client: AsyncClient):
    """Founder can restore an archived startup."""
    headers = await _get_auth_header(async_client)
    unique_name = f"RestoreStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    await async_client.patch(f"/api/v1/startups/{startup_id}/archive", headers=headers)
    response = await async_client.patch(f"/api/v1/startups/{startup_id}/restore", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "active"


async def test_activate_startup(async_client: AsyncClient):
    """Activate startup sets it as the active workspace and updates user preferences."""
    headers = await _get_auth_header(async_client)
    unique_name = f"ActivateStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.patch(f"/api/v1/startups/{startup_id}/activate", headers=headers)
    assert response.status_code == 200

    # Verify preference is updated
    me = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me.json()["data"]["preferences"]["active_startup_id"] == startup_id


async def test_delete_startup(async_client: AsyncClient):
    """Founder can delete their startup workspace."""
    headers = await _get_auth_header(async_client)
    unique_name = f"DeleteStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.delete(f"/api/v1/startups/{startup_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify it's gone
    get_response = await async_client.get(f"/api/v1/startups/{startup_id}", headers=headers)
    assert get_response.status_code == 404


async def test_delete_startup_unauthorized(async_client: AsyncClient):
    """Founder B cannot delete Founder A's startup."""
    headers_a = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN)
    headers_b = await _get_auth_header(async_client, TEST_GOOGLE_TOKEN_B)

    unique_name = f"ProtectedStartup {uuid.uuid4().hex[:6]}"
    create = await async_client.post("/api/v1/startups", headers=headers_a, json={"name": unique_name, "stage": "idea"})
    startup_id = create.json()["data"]["id"]

    response = await async_client.delete(f"/api/v1/startups/{startup_id}", headers=headers_b)
    assert response.status_code == 404
