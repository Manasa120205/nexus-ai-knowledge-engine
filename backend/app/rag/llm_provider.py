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
                "answer": (
                    f"Your uploaded documents do not contain sufficient evidence to answer: \"{query}\".\n\n"
                    "**Tip:** You can upload documents, PDFs, or YouTube transcripts in the **Knowledge Base** tab to search and ask questions about them."
                ),
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        # Filter out common conversational words so content terms (even short ones like AI, DB, OS) match
        STOP_WORDS = {
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
            "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
            "below", "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't",
            "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
            "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
            "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
            "how", "i", "i'm", "if", "in", "into", "is", "isn't", "it", "its", "let's",
            "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once",
            "only", "or", "other", "our", "out", "over", "own", "same", "she", "should",
            "so", "some", "such", "tell", "than", "that", "the", "their", "theirs", "them",
            "then", "there", "these", "they", "this", "those", "through", "to", "too",
            "under", "until", "up", "very", "was", "we", "were", "what", "when", "where",
            "which", "while", "who", "whom", "why", "with", "would", "you", "your",
            "document", "documents", "file", "files", "text", "please", "says", "say"
        }

        raw_words = re.findall(r"[a-zA-Z0-9_\-\.\+]+", query.lower())
        content_words = [w for w in raw_words if w not in STOP_WORDS and len(w) >= 2]
        if not content_words:
            content_words = [w for w in raw_words if len(w) >= 2]

        chunk_texts = [c.get("metadata", {}).get("text", "") for c in context_chunks]
        all_chunk_text = " ".join(chunk_texts).lower()

        # Check evidence match
        matching_words = [w for w in content_words if w in all_chunk_text]
        has_direct_match = bool(matching_words) or (query.strip().lower() in all_chunk_text)

        # If user asked a query with content words but none appear in retrieved context, refuse politely
        if content_words and not has_direct_match:
            return {
                "answer": (
                    f"Your uploaded documents do not contain sufficient evidence to answer: \"{query}\".\n\n"
                    "I searched through your uploaded knowledge sources, but could not find information matching your query. "
                    "Please check your documents in the **Knowledge Base** or rephrase your question."
                ),
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        # Extract and synthesize the most relevant statements from top chunks
        synthesized_paragraphs = []
        cited_indices = []

        for idx, chunk in enumerate(context_chunks[:3], start=1):
            text = chunk.get("metadata", {}).get("text", "")
            if not text:
                continue

            # Split into natural sentences and lines
            lines_and_sentences = [
                s.strip()
                for s in re.split(r"(?<=[.!?])\s+|\n{2,}", text)
                if s.strip() and len(s.strip()) > 10
            ]

            # Find matching sentences
            relevant_sentences = []
            for s in lines_and_sentences:
                s_lower = s.lower()
                if any(w in s_lower for w in content_words) or query.lower() in s_lower:
                    relevant_sentences.append(s)

            if relevant_sentences:
                passage = " ".join(relevant_sentences[:4])
                synthesized_paragraphs.append(f"{passage} [{idx}]")
                cited_indices.append(idx)
            elif lines_and_sentences:
                passage = " ".join(lines_and_sentences[:2])
                synthesized_paragraphs.append(f"{passage} [{idx}]")
                cited_indices.append(idx)

        if not synthesized_paragraphs:
            return {
                "answer": (
                    f"Your uploaded documents do not contain sufficient evidence to answer: \"{query}\".\n\n"
                    "No relevant passages could be extracted from your files."
                ),
                "cited_chunk_indices": [],
                "model_name": self.name,
                "sufficient_evidence": False,
            }

        answer = "\n\n".join(synthesized_paragraphs)
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
