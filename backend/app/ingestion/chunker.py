import re
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings


class StructureAwareChunker:
    """
    Intelligent structure-aware text chunker.
    Splits text while respecting:
    - Headings (Markdown '#', '##', capital section headers, 'Chapter')
    - Paragraph boundaries ('\\n\\n')
    - Sentence boundaries ('. ', '? ', '! ')
    - Source metadata (page numbers, video timestamps)
    """

    def __init__(
        self,
        chunk_size_tokens: int = settings.CHUNK_SIZE_TOKENS,
        chunk_overlap_tokens: int = settings.CHUNK_OVERLAP_TOKENS,
    ):
        self.chunk_size_chars = chunk_size_tokens * 4  # Approximate 1 token ~= 4 chars
        self.chunk_overlap_chars = chunk_overlap_tokens * 4

    def chunk_structured_elements(
        self,
        elements: List[Dict[str, Any]],
        document_id: str,
        source_type: str,
    ) -> List[Dict[str, Any]]:
        """
        Takes raw structural elements (e.g. pages from PDF or transcript slices from YouTube)
        and produces continuous, boundary-aware chunks with metadata.
        Each element is expected to have:
        {'text': str, 'page_number': Optional[int], 'timestamp_seconds': Optional[float], 'section': Optional[str]}
        """
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for elem in elements:
            raw_text = elem.get("text", "").strip()
            if not raw_text:
                continue

            page_number = elem.get("page_number")
            timestamp_seconds = elem.get("timestamp_seconds")
            current_section = elem.get("section", "General")

            # Split paragraphs
            paragraphs = re.split(r"\n\s*\n", raw_text)
            current_chunk_text = ""

            for p in paragraphs:
                p_clean = p.strip()
                if not p_clean:
                    continue

                # Check if paragraph itself looks like a heading
                if re.match(r"^(#+|[0-9]+\.[0-9]*|[A-Z\s]{4,30}$)", p_clean) and len(p_clean) < 100:
                    current_section = p_clean.lstrip("#").strip()

                if len(current_chunk_text) + len(p_clean) <= self.chunk_size_chars:
                    current_chunk_text += ("\n\n" if current_chunk_text else "") + p_clean
                else:
                    # Flush current chunk
                    if current_chunk_text:
                        chunks.append({
                            "chunk_index": chunk_index,
                            "document_id": document_id,
                            "text": current_chunk_text,
                            "page_number": page_number,
                            "section": current_section,
                            "timestamp_seconds": timestamp_seconds,
                            "source_type": source_type,
                            "token_count": max(1, len(current_chunk_text) // 4),
                        })
                        chunk_index += 1

                    # Handle case where single paragraph exceeds chunk size
                    if len(p_clean) > self.chunk_size_chars:
                        sentences = re.split(r"(?<=[.!?])\s+", p_clean)
                        sub_chunk = ""
                        for sent in sentences:
                            if len(sub_chunk) + len(sent) <= self.chunk_size_chars:
                                sub_chunk += (" " if sub_chunk else "") + sent
                            else:
                                if sub_chunk:
                                    chunks.append({
                                        "chunk_index": chunk_index,
                                        "document_id": document_id,
                                        "text": sub_chunk,
                                        "page_number": page_number,
                                        "section": current_section,
                                        "timestamp_seconds": timestamp_seconds,
                                        "source_type": source_type,
                                        "token_count": max(1, len(sub_chunk) // 4),
                                    })
                                    chunk_index += 1
                                sub_chunk = sent
                        current_chunk_text = sub_chunk
                    else:
                        current_chunk_text = p_clean

            # Flush trailing chunk
            if current_chunk_text:
                chunks.append({
                    "chunk_index": chunk_index,
                    "document_id": document_id,
                    "text": current_chunk_text,
                    "page_number": page_number,
                    "section": current_section,
                    "timestamp_seconds": timestamp_seconds,
                    "source_type": source_type,
                    "token_count": max(1, len(current_chunk_text) // 4),
                })
                chunk_index += 1

        return chunks


chunker = StructureAwareChunker()
