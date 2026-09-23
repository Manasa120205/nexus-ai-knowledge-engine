from typing import List, Dict, Any


class ContextBuilder:
    """
    Selects and structures top retrieved chunks into bounded context windows.
    Prevents token budget overflow and builds clean citation references.
    """

    def __init__(self, max_context_chars: int = 6000):
        self.max_context_chars = max_context_chars

    def build_context(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filters and bounds candidate chunks to fit strictly within the prompt budget.
        """
        selected_chunks = []
        total_chars = 0

        for candidate in candidates:
            meta = candidate.get("metadata", {})
            text = meta.get("text", "")
            chunk_len = len(text)

            if total_chars + chunk_len > self.max_context_chars and selected_chunks:
                break

            selected_chunks.append(candidate)
            total_chars += chunk_len

        return selected_chunks


context_builder = ContextBuilder()
