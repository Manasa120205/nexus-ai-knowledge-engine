import re
from typing import List, Dict, Any


class QueryPreprocessor:
    """
    Normalizes user queries while strictly preserving technical tokens,
    camelCase identifiers, snake_case tokens, API names, and symbols like C++ or gRPC.
    """

    # Common English stop words that don't add technical retrieval value
    STOP_WORDS = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
        "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
        "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
        "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
        "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
        "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
        "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
        "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
        "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
        "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
        "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
        "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
        "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
        "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
        "they're", "they've", "this", "those", "through", "to", "too", "under",
        "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
        "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
        "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
        "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
        "your", "yours", "yourself", "yourselves"
    }

    @classmethod
    def normalize(cls, query: str) -> str:
        """
        Cleans excessive whitespace, trims, and normalizes unicode spacing.
        Preserves technical tokens and punctuation.
        """
        if not query:
            return ""
        # Collapse multiple spaces, tabs, newlines
        cleaned = re.sub(r"\s+", " ", query).strip()
        return cleaned

    @classmethod
    def extract_keywords(cls, query: str) -> List[str]:
        """
        Extracts keyword tokens for BM25 search.
        Preserves technical terms: e.g. 'c++', 'gRPC', 'node.js', 'v1.2.0', 'ERR_CONNECTION_REFUSED'
        """
        normalized = cls.normalize(query)
        # Token pattern capturing words, dotted names, hyphenated terms, plus symbols (C++)
        tokens = re.findall(r"[a-zA-Z0-9_\-\.\+]+", normalized)
        
        keywords = []
        for t in tokens:
            lower = t.lower()
            # Do not filter stop word if it looks like a version or code (e.g. "it" in "IT" or numbers)
            if lower not in cls.STOP_WORDS or re.search(r"\d|[\.\-_]", t) or t in {"c++", "c#"}:
                keywords.append(t)
                
        return keywords if keywords else tokens

    @classmethod
    def get_query_metadata(cls, query: str) -> Dict[str, Any]:
        """Analyzes query characteristics to aid retrieval strategy."""
        normalized = cls.normalize(query)
        keywords = cls.extract_keywords(normalized)
        is_code_search = bool(re.search(r"def |function|class |import |\.py|\.ts|\.js|=>|::|->|#include", query))
        has_error_code = bool(re.search(r"\b(error|exception|err_|404|500|401|403|502|status_code)\b", query, re.I))

        return {
            "raw_query": query,
            "normalized_query": normalized,
            "keywords": keywords,
            "token_count": len(keywords),
            "is_code_search": is_code_search,
            "has_error_code": has_error_code,
        }


query_preprocessor = QueryPreprocessor()
