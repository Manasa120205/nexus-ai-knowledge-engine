import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    payload = {
        "email": "newuser@nexus.ai",
        "password": "SecurePassword123!",
        "full_name": "New Systems Engineer",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@nexus.ai"
    assert data["full_name"] == "New Systems Engineer"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient, test_user):
    payload = {
        "email": test_user.email,
        "password": "AnotherPassword123!",
        "full_name": "Duplicate User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_user.email


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, auth_headers, test_user):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["id"] == test_user.id


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_registration_weak_password_fails(client: AsyncClient):
    payload = {
        "email": "weak@nexus.ai",
        "password": "short",  # under 8 chars
        "full_name": "Weak User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_registration_invalid_email_fails(client: AsyncClient):
    payload = {
        "email": "not-a-valid-email",
        "password": "ValidPassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_with_json_payload(client: AsyncClient, test_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user.email

