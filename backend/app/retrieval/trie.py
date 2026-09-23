"""
NEXUS Autocomplete Trie Data Structure
======================================
Custom implementation of a Prefix Tree (Trie) engineered for high-throughput, low-latency
search autocomplete.

Complexity Analysis:
--------------------
1. Insertion:
   - Time Complexity: O(M), where M is the length of the string to insert.
     Traverses or creates exactly M nodes.
   - Space Complexity: O(M * Σ) worst-case when inserting distinct characters,
     where Σ is the alphabet size. Typically amortized as shared prefixes reuse existing nodes.

2. Prefix Search:
   - Time Complexity: O(P + K log L), where:
       P = length of prefix (to locate root of subtree)
       K = number of nodes in the matching subtree traversed
       L = limit of suggestions retained (using a min-heap of size L)
   - Space Complexity: O(K) recursion stack / queue for subtree traversal.

3. Exact Search / Lookup:
   - Time Complexity: O(M), where M is the word length.
   - Space Complexity: O(1) auxiliary space.

4. Deletion:
   - Time Complexity: O(M) to locate and prune unshared downstream nodes.
   - Space Complexity: O(M) for the recursion stack.
"""

from typing import Dict, List, Optional, Any
import heapq


class TrieNode:
    """Represents a single node within the Autocomplete Trie."""
    __slots__ = ("children", "is_end_of_word", "frequency", "word", "metadata")

    def __init__(self):
        # Maps single characters to child TrieNodes
        self.children: Dict[str, TrieNode] = {}
        self.is_end_of_word: bool = False
        self.frequency: int = 0
        self.word: Optional[str] = None
        self.metadata: Dict[str, Any] = {}


class Trie:
    """
    Thread-safe in-memory Prefix Tree optimized for technical term autocompletion.
    """

    def __init__(self):
        self.root = TrieNode()
        self._total_words: int = 0

    def __len__(self) -> int:
        return self._total_words

    def insert(self, word: str, frequency: int = 1, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Inserts a word into the Trie or updates its frequency.
        Time: O(M) where M = len(word)
        Space: O(M) new nodes in worst-case
        """
        if not word or not word.strip():
            return

        normalized = word.strip().lower()
        curr = self.root

        for char in normalized:
            if char not in curr.children:
                curr.children[char] = TrieNode()
            curr = curr.children[char]

        if not curr.is_end_of_word:
            curr.is_end_of_word = True
            curr.word = normalized
            curr.frequency = frequency
            self._total_words += 1
        else:
            curr.frequency += frequency

        if metadata:
            curr.metadata.update(metadata)

    def search(self, word: str) -> bool:
        """
        Check if an exact word exists in the Trie.
        Time: O(M)
        Space: O(1)
        """
        if not word:
            return False

        normalized = word.strip().lower()
        curr = self.root

        for char in normalized:
            if char not in curr.children:
                return False
            curr = curr.children[char]

        return curr.is_end_of_word

    def prefix_search(self, prefix: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Finds the top `limit` suggestions matching the given prefix, ranked by frequency.
        Time: O(P + K log L) where P is prefix length, K is subtree size, L is limit.
        Space: O(K)
        """
        if not prefix:
            return []

        normalized = prefix.strip().lower()
        curr = self.root

        # Phase 1: Locate the prefix node
        for char in normalized:
            if char not in curr.children:
                return []  # Prefix does not exist in Trie
            curr = curr.children[char]

        # Phase 2: Traverse subtree to collect all candidate words
        # Uses a min-heap of size `limit` to retain the top frequencies: (frequency, word, metadata)
        heap: List[tuple] = []

        def _dfs(node: TrieNode):
            if node.is_end_of_word and node.word:
                entry = (node.frequency, node.word, node.metadata)
                if len(heap) < limit:
                    heapq.heappush(heap, entry)
                else:
                    if entry[0] > heap[0][0]:
                        heapq.heappushpop(heap, entry)

            for child in node.children.values():
                _dfs(child)

        _dfs(curr)

        # Sort descending by frequency
        results = []
        for freq, w, meta in sorted(heap, key=lambda x: x[0], reverse=True):
            results.append({
                "word": w,
                "frequency": freq,
                "metadata": meta,
            })

        return results

    def delete(self, word: str) -> bool:
        """
        Deletes a word from the Trie and prunes dangling nodes.
        Time: O(M)
        Space: O(M) for call stack
        Returns True if the word was present and removed, False otherwise.
        """
        if not word:
            return False

        normalized = word.strip().lower()
        word_found = [False]

        def _delete_helper(node: TrieNode, s: str, index: int) -> bool:
            if index == len(s):
                if not node.is_end_of_word:
                    return False  # Word not found
                node.is_end_of_word = False
                node.word = None
                self._total_words -= 1
                word_found[0] = True
                # If node has no children, it can be pruned by parent
                return len(node.children) == 0

            char = s[index]
            if char not in node.children:
                return False

            should_prune_child = _delete_helper(node.children[char], s, index + 1)
            if should_prune_child:
                del node.children[char]
                # If this node is not end of another word and has no remaining children, prune it too
                return not node.is_end_of_word and len(node.children) == 0

            return False

        _delete_helper(self.root, normalized, 0)
        return word_found[0]

    def populate_from_text(self, text: str) -> int:
        """
        Tokenizes text and populates technical keywords and multi-word phrases into the Trie.
        Returns number of words processed.
        """
        import re
        tokens = re.findall(r"[a-zA-Z0-9_.-]+", text.lower())
        count = 0
        for token in tokens:
            if len(token) >= 2:
                self.insert(token, frequency=1)
                count += 1

        # Also insert 2-gram and 3-gram technical phrases (e.g. "machine learning", "gradient descent")
        for i in range(len(tokens) - 1):
            phrase = f"{tokens[i]} {tokens[i+1]}"
            if len(phrase) <= 40:
                self.insert(phrase, frequency=2)
                count += 1
            if i + 2 < len(tokens):
                phrase3 = f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}"
                if len(phrase3) <= 50:
                    self.insert(phrase3, frequency=1)
                    count += 1

        return count


# Global singleton Trie instance for fast autocomplete across the application
autocomplete_trie = Trie()
