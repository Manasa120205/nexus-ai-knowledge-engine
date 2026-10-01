import re
from typing import List, Set

LIGATURE_MAP = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "ft",
    "\ufb06": "st",
}

COMMON_STOPWORDS: Set[str] = {
    "a", "an", "the", "in", "on", "of", "to", "for", "with", "at", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "and", "or", "but", "if", "then", "else", "what", "which",
    "who", "when", "where", "why", "how", "all", "any", "both", "each", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "can", "will", "just", "should", "now"
}


def clean_extracted_text(text: str) -> str:
    """
    Cleans raw extracted text from PDFs, OCR, and documents:
    - Normalizes Unicode ligatures (fi, fl, ff)
    - Strips unprintable control codes and private-use characters
    - Fixes hyphenated line breaks (e.g. 'struc-\\nture' -> 'structure')
    - Inserts missing whitespace after punctuation and between squashed words
    - Normalizes abnormal spaces and cleans up broken symbols
    """
    if not text:
        return ""

    # 1. Normalize ligatures
    for lig, replacement in LIGATURE_MAP.items():
        text = text.replace(lig, replacement)

    # 2. Strip unprintable control characters and private-use area glyphs
    # Keeps standard whitespace (newline, tab, space)
    text = re.sub(r"[\uf000-\uf8ff\ufffd\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", text)

    # 3. Clean decorative bullet symbols, arrows, and stars
    text = re.sub(r"[\u2022\u2023\u25aa\u25ab\u25b6\u25cf\u25c6\u2713\u2714\u2605\u2606]", " ", text)

    # 4. Fix line break hyphens: e.g. "struc-\n tural" or "algo-\nrithm"
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)

    # 5. Fix soft hyphens
    text = text.replace("\u00ad", "")

    # 6. Replace single newlines with a space (preserving double newlines for paragraphs)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)

    # 7. Insert space after punctuation when followed directly by a letter or number:
    # e.g., "storage.Next" -> "storage. Next", "data,including" -> "data, including"
    text = re.sub(r"([a-zA-Z0-9])([.,!?:;])([A-Za-z])", r"\1\2 \3", text)

    # 8. Insert space around parentheses if squashed against words: "table(name)" -> "table (name)"
    text = re.sub(r"([a-zA-Z0-9])(\()", r"\1 \2", text)
    text = re.sub(r"(\))([a-zA-Z0-9])", r"\1 \2", text)

    # 9. Separate squashed CamelCase words commonly found in PDF text extraction:
    # e.g., "theDatabaseIs" -> "the Database Is"
    text = re.sub(r"([a-z]{2,})([A-Z][a-z])", r"\1 \2", text)

    # 10. Clean repeated strange symbols (e.g. '~~~~', '----', '____')
    text = re.sub(r"[~^|_\\]{2,}", " ", text)

    # 11. Collapse tabs, non-breaking spaces, and multiple spaces into a single space
    text = re.sub(r"[ \t\u00a0\u200b]+", " ", text)

    return text.strip()


def extract_focused_keyword_snippet(text: str, query: str, max_chars: int = 190) -> str:
    """
    Extracts ONLY the concise information directly related to the searched query/keyword.
    Instead of dumping the entire chunk, selects the best matching sentence or focused window.
    """
    cleaned = clean_extracted_text(text)
    if not cleaned:
        return ""

    if not query or not query.strip():
        if len(cleaned) <= max_chars:
            return cleaned
        truncated = cleaned[:max_chars].rsplit(" ", 1)[0]
        return f"{truncated}..."

    # Extract meaningful keywords from query (excluding common stopwords)
    words = re.findall(r"\b\w+\b", query)
    keywords = [w.lower() for w in words if w.lower() not in COMMON_STOPWORDS and len(w) > 1]
    if not keywords:
        keywords = [w.lower() for w in words if len(w) > 0]

    # Split text into sentences
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]
    if not sentences:
        sentences = [cleaned]

    # Score each sentence based on keyword occurrences and exact query matches
    best_sentence_idx = -1
    best_score = 0
    query_lower = query.lower().strip()

    for idx, sent in enumerate(sentences):
        sent_lower = sent.lower()
        score = sum(1 for kw in keywords if kw in sent_lower)
        if query_lower in sent_lower:
            score += 10
        if score > best_score:
            best_score = score
            best_sentence_idx = idx

    # If a sentence containing the keyword was found:
    if best_sentence_idx != -1 and best_score > 0:
        chosen = sentences[best_sentence_idx]

        # If sentence is short, try appending the subsequent sentence if it fits
        if len(chosen) < 90 and best_sentence_idx + 1 < len(sentences):
            next_sent = sentences[best_sentence_idx + 1]
            if len(chosen) + len(next_sent) + 1 <= max_chars:
                chosen = f"{chosen} {next_sent}"

        # If chosen sentence is longer than max_chars, center a window around the matched keyword
        if len(chosen) > max_chars:
            sent_lower = chosen.lower()
            match_pos = -1
            # Look for exact query first, then individual keywords
            if query_lower in sent_lower:
                match_pos = sent_lower.find(query_lower)
            else:
                for kw in keywords:
                    p = sent_lower.find(kw)
                    if p != -1:
                        match_pos = p
                        break

            if match_pos != -1:
                half_window = (max_chars - 30) // 2
                start = max(0, match_pos - half_window)
                end = min(len(chosen), match_pos + half_window + 30)

                # Snap to nearest word boundary
                if start > 0:
                    next_space = chosen.find(" ", start)
                    if next_space != -1 and next_space < match_pos:
                        start = next_space + 1
                if end < len(chosen):
                    prev_space = chosen.rfind(" ", match_pos, end)
                    if prev_space != -1 and prev_space > match_pos:
                        end = prev_space

                cropped = chosen[start:end].strip()
                prefix = "... " if start > 0 else ""
                suffix = " ..." if end < len(chosen) else ""
                return f"{prefix}{cropped}{suffix}".strip()
            else:
                truncated = chosen[:max_chars].rsplit(" ", 1)[0]
                return f"{truncated}..."

        prefix = "... " if best_sentence_idx > 0 else ""
        suffix = " ..." if best_sentence_idx < len(sentences) - 1 else ""
        return f"{prefix}{chosen}{suffix}".strip()

    # Fallback when no direct keyword match in sentences (e.g. purely semantic search match)
    if len(cleaned) <= max_chars:
        return cleaned
    truncated = cleaned[:max_chars].rsplit(" ", 1)[0]
    return f"{truncated}..."
