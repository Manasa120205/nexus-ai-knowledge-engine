import pytest
from httpx import AsyncClient
from backend.app.rag.llm_provider import LocalDevelopmentProvider


@pytest.mark.asyncio
async def test_rag_grounded_answer_with_citations():
    provider = LocalDevelopmentProvider()
    context = [
        {
            "chunk_id": "c-101",
            "metadata": {
                "text": "The Write-Ahead Log (WAL) ensures ACID durability by writing changes to sequential disk storage before modifying table pages.",
                "document_title": "Database Internals",
                "section": "WAL",
                "page_number": 4,
            },
        }
    ]

    result = await provider.generate_grounded_answer(
        query="What is the role of WAL in databases?",
        context_chunks=context,
    )

    assert result["sufficient_evidence"] is True
    assert "[1]" in result["answer"]
    assert 1 in result["cited_chunk_indices"]


@pytest.mark.asyncio
async def test_rag_unsupported_question_refusal():
    provider = LocalDevelopmentProvider()
    # Context discusses database logging
    context = [
        {
            "chunk_id": "c-102",
            "metadata": {
                "text": "Write-ahead logging records data modifications sequentially to persistent disk storage.",
                "document_title": "Database Internals",
            },
        }
    ]

    # Query asks completely unrelated question
    result = await provider.generate_grounded_answer(
        query="What is the capital of Australia and its climate?",
        context_chunks=context,
    )

    # Must refuse to fabricate an answer
    assert result["sufficient_evidence"] is False
    assert "not contain sufficient evidence" in result["answer"].lower()
    assert len(result["cited_chunk_indices"]) == 0


@pytest.mark.asyncio
async def test_ask_endpoint_integration(client: AsyncClient, auth_headers):
    # Seed document first
    files = {"file": ("raft.md", b"# Raft Consensus\nRaft uses randomized election timeouts between 150ms and 300ms to elect leaders.", "text/markdown")}
    res_upload = await client.post("/api/v1/documents/upload", headers=auth_headers, files=files)
    assert res_upload.status_code == 201

    # Ask question
    res_ask = await client.post(
        "/api/v1/rag/ask",
        headers=auth_headers,
        json={"query": "How does Raft elect leaders?", "mode": "hybrid", "top_k": 3},
    )
    assert res_ask.status_code == 200
    data = res_ask.json()
    assert "answer" in data
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["document_title"] == "raft"
    assert data["latency_ms"] > 0
