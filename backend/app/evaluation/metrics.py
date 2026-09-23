import math
import re
from typing import List, Dict, Any


def _is_relevant(chunk_text: str, expected_keywords: List[str]) -> float:
    """
    Returns relevance grade [0.0, 1.0] based on key concept presence in chunk.
    """
    if not chunk_text or not expected_keywords:
        return 0.0
    text_lower = chunk_text.lower()
    matches = sum(1 for kw in expected_keywords if kw.lower() in text_lower)
    return min(1.0, matches / max(1, len(expected_keywords) * 0.4))


def calculate_recall_at_k(retrieved_chunks: List[str], expected_keywords: List[str], k: int = 5) -> float:
    """
    Measures whether at least one highly relevant chunk is present in the top K.
    """
    top_chunks = retrieved_chunks[:k]
    if not top_chunks or not expected_keywords:
        return 0.0
    for chunk in top_chunks:
        if _is_relevant(chunk, expected_keywords) >= 0.5:
            return 1.0
    return 0.0


def calculate_precision_at_k(retrieved_chunks: List[str], expected_keywords: List[str], k: int = 5) -> float:
    """
    Fraction of top K retrieved chunks that are relevant.
    """
    top_chunks = retrieved_chunks[:k]
    if not top_chunks:
        return 0.0
    relevant_count = sum(1 for c in top_chunks if _is_relevant(c, expected_keywords) >= 0.4)
    return relevant_count / len(top_chunks)


def calculate_mrr(retrieved_chunks: List[str], expected_keywords: List[str]) -> float:
    """
    Mean Reciprocal Rank: 1 / rank of first relevant chunk (1-indexed).
    """
    for rank, chunk in enumerate(retrieved_chunks, start=1):
        if _is_relevant(chunk, expected_keywords) >= 0.5:
            return 1.0 / rank
    return 0.0


def calculate_ndcg_at_k(retrieved_chunks: List[str], expected_keywords: List[str], k: int = 5) -> float:
    """
    Normalized Discounted Cumulative Gain at K.
    """
    top_chunks = retrieved_chunks[:k]
    if not top_chunks:
        return 0.0

    dcg = 0.0
    for i, chunk in enumerate(top_chunks):
        rel = _is_relevant(chunk, expected_keywords)
        dcg += rel / math.log2(i + 2)  # i+2 because i is 0-indexed (rank 1 -> log2(2) = 1)

    # Calculate Ideal DCG (all top elements with relevance 1.0)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(top_chunks), 3)))
    if idcg <= 0:
        return 0.0

    return min(1.0, dcg / idcg)


def calculate_groundedness(answer: str, context_chunks: List[str]) -> float:
    """
    Measures percentage of claims in answer supported by retrieved context.
    """
    if not answer or not context_chunks:
        return 0.0
    
    # Check if answer is a refusal due to lack of evidence
    if "not contain" in answer.lower() or "insufficient evidence" in answer.lower():
        return 1.0  # Completely faithful refusal

    all_context = " ".join(context_chunks).lower()
    sentences = [s.strip() for s in re.split(r"[.!?]\s+", answer) if len(s.strip()) > 10]
    if not sentences:
        return 1.0

    supported = 0
    for sent in sentences:
        words = [w for w in re.findall(r"[a-zA-Z0-9_\-]+", sent.lower()) if len(w) > 3]
        if not words:
            supported += 1
            continue
        match_count = sum(1 for w in words if w in all_context)
        if match_count / len(words) >= 0.4:
            supported += 1

    return supported / len(sentences)


def calculate_citation_accuracy(
    citations: List[Dict[str, Any]],
    expected_source: str,
) -> float:
    """
    Measures whether generated citations reference the correct expected technical document.
    """
    if not citations:
        return 0.0
    matching = 0
    for cit in citations:
        title = cit.get("document_title", "").lower()
        if expected_source.lower() in title or title in expected_source.lower():
            matching += 1
        elif any(part.lower() in title for part in expected_source.split()):
            matching += 1

    return matching / len(citations)
