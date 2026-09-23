import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader
from backend.app.core.logging import logger


class PDFExtractor:
    """
    Extracts structured pages and sections from PDF documents.
    Preserves page numbers, title heuristics, and heading metadata.
    """

    @classmethod
    def extract_from_bytes(cls, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Parses PDF binary stream into a list of structured page elements.
        """
        elements: List[Dict[str, Any]] = []
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            total_pages = len(reader.pages)

            for page_idx, page in enumerate(reader.pages, start=1):
                raw_text = page.extract_text() or ""
                clean_text = raw_text.strip()
                if not clean_text:
                    continue

                # Heading detection heuristic: first line if capitalized or short
                lines = [l.strip() for l in clean_text.splitlines() if l.strip()]
                section_title = f"Page {page_idx}"
                if lines and len(lines[0]) < 80 and not lines[0].endswith("."):
                    section_title = lines[0]

                elements.append({
                    "text": clean_text,
                    "page_number": page_idx,
                    "section": section_title,
                    "timestamp_seconds": None,
                })

            return elements
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Could not parse PDF document: {str(e)}")
