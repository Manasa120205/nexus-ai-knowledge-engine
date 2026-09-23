import pytest
from httpx import AsyncClient
from backend.app.cache.redis_cache import cache_manager


@pytest.mark.asyncio
async def test_document_user_isolation(client: AsyncClient, auth_headers, auth_headers_b):
    # 1. User A uploads a document
    file_content = b"# Tenant A Confidential\nThis is proprietary architecture documentation for Tenant A."
    files = {"file": ("tenant_a.md", file_content, "text/markdown")}
    res_a = await client.post("/api/v1/documents/upload", headers=auth_headers, files=files)
    assert res_a.status_code == 201
    doc_a_id = res_a.json()["id"]

    # 2. User B lists documents -> doc_a must NOT appear
    res_b_list = await client.get("/api/v1/documents/", headers=auth_headers_b)
    assert res_b_list.status_code == 200
    docs_b = res_b_list.json()
    assert all(d["id"] != doc_a_id for d in docs_b)

    # 3. User B attempts to access doc_a by ID directly -> must return 404
    res_b_direct = await client.get(f"/api/v1/documents/{doc_a_id}", headers=auth_headers_b)
    assert res_b_direct.status_code == 404

    # 4. User B attempts to delete doc_a -> must return 404 and not delete
    res_b_del = await client.delete(f"/api/v1/documents/{doc_a_id}", headers=auth_headers_b)
    assert res_b_del.status_code == 404

    # 5. User A can still access doc_a
    res_a_check = await client.get(f"/api/v1/documents/{doc_a_id}", headers=auth_headers)
    assert res_a_check.status_code == 200


@pytest.mark.asyncio
async def test_cache_user_isolation(test_user, test_user_b):
    # Verify cache key generation separates tenants
    key_a = cache_manager.build_user_key(user_id=test_user.id, namespace="rag", key_suffix="hash123")
    key_b = cache_manager.build_user_key(user_id=test_user_b.id, namespace="rag", key_suffix="hash123")

    assert key_a != key_b
    assert test_user.id in key_a
    assert test_user_b.id in key_b

    # Set value for User A
    await cache_manager.set(key_a, {"secret": "tenant_a_data"})
    
    val_a = await cache_manager.get(key_a)
    val_b = await cache_manager.get(key_b)

    assert val_a == {"secret": "tenant_a_data"}
    assert val_b is None  # User B must not see User A's cache


@pytest.mark.asyncio
async def test_query_history_user_isolation(client: AsyncClient, auth_headers, auth_headers_b):
    # 1. User A executes a search / RAG question
    res_a = await client.post(
        "/api/v1/rag/ask",
        headers=auth_headers,
        json={"query": "Explain write ahead logging in storage engines"},
    )
    assert res_a.status_code == 200

    # 2. User A has history
    history_a = (await client.get("/api/v1/history/", headers=auth_headers)).json()
    assert len(history_a) >= 1
    query_a_id = history_a[0]["id"]

    # 3. User B lists history -> User A's query must NOT appear
    history_b = (await client.get("/api/v1/history/", headers=auth_headers_b)).json()
    assert all(h["id"] != query_a_id for h in history_b)

    # 4. User B attempts to access User A's query by ID -> 404
    res_b_direct = await client.get(f"/api/v1/history/{query_a_id}", headers=auth_headers_b)
    assert res_b_direct.status_code == 404

    # 5. User B attempts to delete User A's query -> 404
    res_b_del = await client.delete(f"/api/v1/history/{query_a_id}", headers=auth_headers_b)
    assert res_b_del.status_code == 404

