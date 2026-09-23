import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        print("\n--- 1. Testing Health Endpoint ---")
        health = await client.get("/health")
        print(f"Health status: {health.status_code}, data: {health.json()}")

        print("\n--- 2. Registering Real User Alice ---")
        alice_data = {
            "email": "alice_test@research.io",
            "password": "StrongPassword999!",
            "full_name": "Alice Turing",
        }
        # In case already registered in previous run, try login or register
        reg_res = await client.post("/api/v1/auth/register", json=alice_data)
        print(f"Register Alice status: {reg_res.status_code}")

        print("\n--- 3. Logging in as Alice ---")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "alice_test@research.io", "password": "StrongPassword999!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        alice_token = login_res.json()["access_token"]
        alice_headers = {"Authorization": f"Bearer {alice_token}"}
        print(f"Alice logged in successfully. Token received: {alice_token[:15]}...")

        print("\n--- 4. Checking Alice's Profile ---")
        me_res = await client.get("/api/v1/auth/me", headers=alice_headers)
        assert me_res.status_code == 200
        alice_profile = me_res.json()
        print(f"Authenticated profile: {alice_profile['full_name']} ({alice_profile['email']})")

        print("\n--- 5. Registering Real User Bob ---")
        bob_data = {
            "email": "bob_test@security.io",
            "password": "StrongPassword999!",
            "full_name": "Bob Knuth",
        }
        await client.post("/api/v1/auth/register", json=bob_data)
        bob_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "bob_test@security.io", "password": "StrongPassword999!"},
        )
        bob_token = bob_login.json()["access_token"]
        bob_headers = {"Authorization": f"Bearer {bob_token}"}
        print("Bob registered and logged in successfully.")

        print("\n--- 6. Alice Uploads a Private Document ---")
        doc_content = b"# Alice Distributed Ledger Architecture\nAlice's private consensus protocol uses Byzantine Fault Tolerance with threshold signatures."
        upload_res = await client.post(
            "/api/v1/documents/upload",
            headers=alice_headers,
            files={"file": ("alice_doc.md", doc_content, "text/markdown")},
        )
        assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
        doc_id = upload_res.json()["id"]
        print(f"Alice document uploaded with ID: {doc_id}")

        print("\n--- 7. Verifying Tenant Isolation (Bob cannot see or search Alice's doc) ---")
        bob_docs = (await client.get("/api/v1/documents/", headers=bob_headers)).json()
        assert all(d["id"] != doc_id for d in bob_docs), "LEAK: Bob saw Alice's document in list!"

        bob_direct = await client.get(f"/api/v1/documents/{doc_id}", headers=bob_headers)
        assert bob_direct.status_code == 404, f"LEAK: Bob accessed Alice's document directly! Status: {bob_direct.status_code}"

        bob_search = (await client.post(
            "/api/v1/search/",
            headers=bob_headers,
            json={"query": "Byzantine Fault Tolerance threshold signatures", "mode": "ranked"},
        )).json()
        assert len(bob_search["results"]) == 0, f"LEAK: Bob retrieved Alice's chunks in search! Count: {len(bob_search['results'])}"
        print("SUCCESS: Tenant isolation verified! Bob cannot access or search Alice's document.")

        print("\n--- 8. Alice Asks Grounded Question ---")
        ask_res = await client.post(
            "/api/v1/rag/ask",
            headers=alice_headers,
            json={"query": "What protocol does Alice's private architecture use?"},
        )
        assert ask_res.status_code == 200, f"Ask failed: {ask_res.text}"
        answer_data = ask_res.json()
        print(f"Answer generated:\n{answer_data['answer']}")
        print(f"Citations count: {len(answer_data['citations'])}")
        assert len(answer_data['citations']) > 0, "No citations generated for grounded answer!"
        print(f"Citation [1]: {answer_data['citations'][0]['document_title']} - '{answer_data['citations'][0]['snippet']}'")

        print("\n--- 9. Alice Checks History ---")
        history_res = await client.get("/api/v1/history/", headers=alice_headers)
        assert history_res.status_code == 200
        history_items = history_res.json()
        assert len(history_items) > 0
        print(f"Alice has {len(history_items)} recorded question(s) in history.")

        print("\n=== ALL REAL USER FLOWS VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(main())
