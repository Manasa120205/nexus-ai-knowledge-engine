import pytest
from backend.app.retrieval.vector_store import VectorStore
from backend.app.retrieval.keyword_search import BM25SearchEngine
from backend.app.retrieval.hybrid import HybridRetriever
from backend.app.retrieval.ranking import CustomRanker
from backend.app.rag.embeddings import LocalEmbeddingProvider


@pytest.mark.asyncio
async def test_bm25_exact_technical_keyword_matching():
    bm25 = BM25SearchEngine()
    bm25.index_chunk(
        chunk_id="chunk-1",
        text="Handling ERR_CONNECTION_TIMED_OUT in gRPC connection pools.",
        metadata={"document_id": "doc-1", "document_title": "Network Error Codes"},
    )
    bm25.index_chunk(
        chunk_id="chunk-2",
        text="Configuring HTTP/2 keep-alive pings and max idle connections.",
        metadata={"document_id": "doc-2", "document_title": "HTTP/2 Guide"},
    )

    # Search exact technical error code
    results = bm25.search("ERR_CONNECTION_TIMED_OUT", top_k=5)
    assert len(results) > 0
    assert results[0]["chunk_id"] == "chunk-1"
    assert results[0]["score"] > 0.0


@pytest.mark.asyncio
async def test_vector_similarity_search():
    embedder = LocalEmbeddingProvider(dimension=64)
    vstore = VectorStore(dimension=64)

    text_a = "Distributed systems consensus protocols with Paxos and Raft."
    text_b = "Cooking Italian pasta with tomato and basil leaves."

    vec_a = await embedder.embed_query(text_a)
    vec_b = await embedder.embed_query(text_b)

    vstore.add_vector("chunk-raft", vec_a, {"document_title": "Consensus"})
    vstore.add_vector("chunk-pasta", vec_b, {"document_title": "Recipes"})

    # Query semantically closer to consensus
    query_vec = await embedder.embed_query("Leader election in replicated state machines")
    results = vstore.search(query_vec, top_k=2)

    assert len(results) == 2
    assert results[0]["chunk_id"] == "chunk-raft"
    assert results[0]["score"] > results[1]["score"]


@pytest.mark.asyncio
async def test_custom_ranker_scoring_breakdown():
    ranker = CustomRanker(
        semantic_weight=0.4,
        keyword_weight=0.4,
        title_weight=0.2,
    )

    candidates = [
        {
            "chunk_id": "c1",
            "semantic_score": 0.85,
            "keyword_score": 0.90,
            "metadata": {
                "document_id": "doc1",
                "document_title": "PostgreSQL Write-Ahead Logging",
                "section": "WAL Internals",
                "created_at_ts": None,
            },
        },
        {
            "chunk_id": "c2",
            "semantic_score": 0.40,
            "keyword_score": 0.30,
            "metadata": {
                "document_id": "doc2",
                "document_title": "Unrelated Topic",
                "section": "Intro",
                "created_at_ts": None,
            },
        },
    ]

    ranked = ranker.rank_candidates("PostgreSQL WAL durability", candidates, top_k=2)
    assert len(ranked) == 2
    assert ranked[0]["chunk_id"] == "c1"
    assert ranked[0]["score"] > ranked[1]["score"]
    assert "semantic_score" in ranked[0]
    assert "keyword_score" in ranked[0]
    assert "title_score" in ranked[0]
