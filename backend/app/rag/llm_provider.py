import abc
import re
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger


class LLMProvider(abc.ABC):
    """Abstract interface for LLM response generation with strict citation grounding."""

    @abc.abstractmethod
    async def generate_grounded_answer(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generates an answer strictly grounded in the supplied context_chunks.
        Returns {
            'answer': str,
            'cited_chunk_indices': List[int], # 1-based indices
            'model_name': str,
            'sufficient_evidence': bool
        }
        """
        pass

    @property
    @abc.abstractmethod
    def name(self) -> str:
        pass


class LocalDevelopmentProvider(LLMProvider):
    """
    Intelligent grounded extractive synthesizer for offline and development environments.
    Strictly verifies whether context contains sufficient evidence for the user query.
    If insufficient evidence exists, clearly refuses to hallucinate and states that indexed sources lack information.
    Synthesizes sentences extracted directly from the top chunks with inline [1], [2] citations.
    """

    @property
    def name(self) -> str:
        return "local-grounded-synthesizer"

    async def generate_grounded_answer(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not context_chunks:
            return {
                "answer": "The indexed sources do not contain any relevant information to answer this question.",
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        # Analyze evidence sufficiency
        query_words = set(re.findall(r"[a-zA-Z0-9_\-\+]+", query.lower()))
        meaningful_query_words = [w for w in query_words if len(w) > 2]
        
        # Calculate term overlap across chunks
        chunk_texts = [c.get("metadata", {}).get("text", "") for c in context_chunks]
        all_chunk_text = " ".join(chunk_texts).lower()

        matching_words = [w for w in meaningful_query_words if w in all_chunk_text]
        overlap_ratio = len(matching_words) / len(meaningful_query_words) if meaningful_query_words else 0.0

        # If overlap is too low (< 25%), refuse to hallucinate
        if overlap_ratio < 0.25 and len(meaningful_query_words) > 0:
            return {
                "answer": (
                    f"The indexed sources do not contain sufficient evidence to answer: \"{query}\". "
                    f"The retrieved context matches only {len(matching_words)} of {len(meaningful_query_words)} query keywords."
                ),
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        # Extract relevant sentences from top chunks
        synthesized_paragraphs = []
        cited_indices = []

        for idx, chunk in enumerate(context_chunks[:3], start=1):
            text = chunk.get("metadata", {}).get("text", "")
            title = chunk.get("metadata", {}).get("document_title", "Document")
            section = chunk.get("metadata", {}).get("section", "Overview")
            
            # Split sentences
            sentences = re.split(r"(?<=[.!?])\s+", text)
            relevant_sentences = []
            for s in sentences:
                s_lower = s.lower()
                if any(w in s_lower for w in meaningful_query_words):
                    relevant_sentences.append(s.strip())

            if relevant_sentences:
                passage = " ".join(relevant_sentences[:3])
                synthesized_paragraphs.append(f"{passage} [{idx}]")
                cited_indices.append(idx)
            elif text:
                # Use opening sentence of top matching chunk as fallback evidence
                first_sent = sentences[0].strip() if sentences else text[:200]
                synthesized_paragraphs.append(f"{first_sent} [{idx}]")
                cited_indices.append(idx)

        if not synthesized_paragraphs:
            return {
                "answer": "The indexed sources do not contain enough specific details to formulate a grounded response.",
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        answer = (
            f"Based on the indexed sources for **{query}**:\n\n"
            + "\n\n".join(synthesized_paragraphs)
        )

        return {
            "answer": answer,
            "cited_chunk_indices": list(set(cited_indices)),
            "model_name": self.name,
            "sufficient_evidence": True,
        }


class GeminiProvider(LLMProvider):
    """Google Gemini API Provider with strict grounding prompt instructions and local fallback."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model
        self._fallback = LocalDevelopmentProvider()

    @property
    def name(self) -> str:
        return f"gemini/{self.model}"

    async def generate_grounded_answer(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not context_chunks:
            return {
                "answer": "The indexed sources do not contain any relevant information to answer this question.",
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        # Build numbered context block
        context_str = ""
        for i, c in enumerate(context_chunks, start=1):
            meta = c.get("metadata", {})
            text = meta.get("text", "")
            title = meta.get("document_title", "Document")
            sec = meta.get("section", "")
            page = meta.get("page_number")
            ts = meta.get("timestamp_seconds")
            loc = f"Page {page}" if page else (f"Timestamp {ts}s" if ts else "")
            header = f"[{i}] {title}" + (f" | {sec}" if sec else "") + (f" ({loc})" if loc else "")
            context_str += f"\n--- Source {header} ---\n{text}\n"

        prompt = f"""You are NEXUS, a high-precision enterprise technical knowledge assistant.
Answer the user's question ONLY using the factual context provided below.

RULES:
1. Every factual statement MUST cite the source using brackets like [1], [2].
2. If the context does NOT contain sufficient evidence to answer the question, clearly state: "The indexed sources do not contain enough information to answer this question."
3. NEVER fabricate citations or invent documents not provided in the context.
4. Keep the answer structured, concise, and technically accurate.

CONTEXT:
{context_str}

USER QUESTION:
{query}

GROUNDED ANSWER:"""

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(
                model_name=self.model,
                generation_config={"temperature": settings.LLM_TEMPERATURE, "max_output_tokens": settings.LLM_MAX_TOKENS}
            )
            resp = model.generate_content(prompt)
            answer_text = resp.text

            # Extract cited bracket indices [1], [2], etc.
            found_citations = [int(m) for m in re.findall(r"\[(\d+)\]", answer_text)]
            valid_citations = [idx for idx in set(found_citations) if 1 <= idx <= len(context_chunks)]
            sufficient = "do not contain enough information" not in answer_text.lower()

            return {
                "answer": answer_text,
                "cited_chunk_indices": valid_citations,
                "model_name": self.name,
                "sufficient_evidence": sufficient,
            }
        except Exception as e:
            logger.warning(f"Gemini LLM API failed ({e}). Falling back to resilient local grounded synthesizer.")
            return await self._fallback.generate_grounded_answer(query, context_chunks)


def get_llm_provider() -> LLMProvider:
    """Factory to retrieve configured LLM provider with fallback."""
    provider_name = settings.LLM_PROVIDER.lower()

    if provider_name == "gemini" and settings.LLM_API_KEY:
        logger.info(f"Initializing Gemini LLM Provider ({settings.LLM_MODEL}).")
        return GeminiProvider(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL)

    logger.info("Initializing Local Development Grounded Synthesizer Provider (Offline ready).")
    return LocalDevelopmentProvider()


llm_service = get_llm_provider()
