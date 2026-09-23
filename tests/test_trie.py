import pytest
from backend.app.retrieval.trie import Trie


def test_trie_insert_and_exact_search():
    trie = Trie()
    trie.insert("raft", frequency=5)
    trie.insert("redis", frequency=10)
    trie.insert("relational", frequency=3)

    assert trie.search("raft") is True
    assert trie.search("redis") is True
    assert trie.search("relational") is True
    assert trie.search("nonexistent") is False
    assert trie.search("red") is False  # Prefix exists, but not full word


def test_trie_case_insensitivity():
    trie = Trie()
    trie.insert("PostgreSQL", frequency=4)

    assert trie.search("postgresql") is True
    assert trie.search("POSTGRESQL") is True
    assert trie.search("PostgreSql") is True


def test_trie_prefix_search_ranking():
    trie = Trie()
    trie.insert("machine learning", frequency=15)
    trie.insert("machine vision", frequency=5)
    trie.insert("machine translation", frequency=10)
    trie.insert("matrix decomposition", frequency=8)

    suggestions = trie.prefix_search("mach", limit=10)
    assert len(suggestions) == 3

    # Must be ranked descending by frequency:
    # 1. machine learning (15)
    # 2. machine translation (10)
    # 3. machine vision (5)
    words = [s["word"] for s in suggestions]
    assert words == ["machine learning", "machine translation", "machine vision"]
    assert suggestions[0]["frequency"] == 15
    assert suggestions[1]["frequency"] == 10
    assert suggestions[2]["frequency"] == 5


def test_trie_prefix_limit():
    trie = Trie()
    for i in range(20):
        trie.insert(f"term_{i:02d}", frequency=i)

    suggestions = trie.prefix_search("term", limit=5)
    assert len(suggestions) == 5
    assert suggestions[0]["frequency"] == 19
    assert suggestions[4]["frequency"] == 15


def test_trie_deletion():
    trie = Trie()
    trie.insert("vector", frequency=1)
    trie.insert("vectorization", frequency=2)

    assert trie.search("vector") is True
    assert trie.search("vectorization") is True

    # Delete "vector"
    deleted = trie.delete("vector")
    assert deleted is True
    assert trie.search("vector") is False
    # "vectorization" should remain intact
    assert trie.search("vectorization") is True

    # Delete non-existent
    assert trie.delete("nonexistent") is False


def test_trie_populate_from_text():
    trie = Trie()
    text = "The write-ahead log WAL guarantees ACID durability in PostgreSQL database engines."
    count = trie.populate_from_text(text)
    assert count > 0

    assert trie.search("durability") is True
    assert trie.search("postgresql") is True
    assert len(trie.prefix_search("write", limit=5)) >= 1
