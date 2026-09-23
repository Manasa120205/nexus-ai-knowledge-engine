import pytest
from backend.app.ingestion.chunker import StructureAwareChunker


def test_chunker_preserves_headings_and_pages():
    chunker = StructureAwareChunker(chunk_size_tokens=100, chunk_overlap_tokens=10)

    elements = [
        {
            "text": "# Architecture\nThe system uses an event loop with non-blocking I/O.\n\n## Concurrency\nWorker threads process requests asynchronously.",
            "page_number": 1,
            "timestamp_seconds": None,
            "section": "Architecture",
        },
        {
            "text": "## Storage Layer\nDatabase pages are persisted via WAL sequential logging.",
            "page_number": 2,
            "timestamp_seconds": None,
            "section": "Storage",
        }
    ]

    chunks = chunker.chunk_structured_elements(elements, document_id="doc-123", source_type="pdf")

    assert len(chunks) >= 2
    assert chunks[0]["document_id"] == "doc-123"
    assert chunks[0]["page_number"] == 1
    assert "event loop" in chunks[0]["text"]
    assert chunks[0]["token_count"] > 0

    # Verify second page chunk
    p2_chunk = next((c for c in chunks if c["page_number"] == 2), None)
    assert p2_chunk is not None
    assert "WAL sequential logging" in p2_chunk["text"]


def test_chunker_handles_timestamps():
    chunker = StructureAwareChunker(chunk_size_tokens=50, chunk_overlap_tokens=5)

    elements = [
        {
            "text": "At three minutes we introduce the Raft consensus algorithm.",
            "page_number": None,
            "timestamp_seconds": 180.5,
            "section": "Timestamp 03:00",
        }
    ]

    chunks = chunker.chunk_structured_elements(elements, document_id="doc-yt", source_type="youtube")
    assert len(chunks) == 1
    assert chunks[0]["timestamp_seconds"] == 180.5
    assert chunks[0]["source_type"] == "youtube"
