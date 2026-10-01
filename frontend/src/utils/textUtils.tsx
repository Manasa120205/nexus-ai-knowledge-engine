import React from 'react';

const LIGATURES: Record<string, string> = {
  '\ufb00': 'ff',
  '\ufb01': 'fi',
  '\ufb02': 'fl',
  '\ufb03': 'ffi',
  '\ufb04': 'ffl',
  '\ufb05': 'ft',
  '\ufb06': 'st',
};

const COMMON_STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'of', 'to', 'for', 'with', 'at', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'and', 'or', 'but', 'if', 'then', 'else', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
]);

/**
 * Cleans raw document text, PDF extractions, and OCR artifacts:
 * - Fixes missing spaces after punctuation and between squashed words
 * - Removes unprintable control symbols, broken glyphs, and weird Unicode tokens
 * - Replaces ligatures (fi, fl, ff) with standard ASCII
 * - De-hyphenates broken words across lines
 * - Collapses multiple spaces
 */
export function cleanText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Replace ligatures
  for (const [lig, rep] of Object.entries(LIGATURES)) {
    cleaned = cleaned.split(lig).join(rep);
  }

  // 2. Strip unprintable control codes and private-use characters
  cleaned = cleaned.replace(/[\uf000-\uf8ff\ufffd\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, ' ');

  // 3. Clean decorative bullet icons, strange arrows and stars
  cleaned = cleaned.replace(/[\u2022\u2023\u25aa\u25ab\u25b6\u25cf\u25c6\u2713\u2714\u2605\u2606]/g, ' ');

  // 4. Fix line break hyphens: "inter-\nface" -> "interface"
  cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');

  // 5. Remove soft hyphens
  cleaned = cleaned.split('\u00ad').join('');

  // 6. Convert lone newlines to spaces (preserving paragraph breaks)
  cleaned = cleaned.replace(/(?<!\n)\n(?!\n)/g, ' ');

  // 7. Insert missing space after punctuation when directly followed by letters/numbers
  cleaned = cleaned.replace(/([a-zA-Z0-9])([.,!?:;])([A-Za-z])/g, '$1$2 $3');

  // 8. Insert space around parentheses squashed against words
  cleaned = cleaned.replace(/([a-zA-Z0-9])(\()/g, '$1 $2');
  cleaned = cleaned.replace(/(\))([a-zA-Z0-9])/g, '$1 $2');

  // 9. Separate squashed CamelCase words from PDF streams
  cleaned = cleaned.replace(/([a-z]{2,})([A-Z][a-z])/g, '$1 $2');

  // 10. Clean repeated strange symbols (e.g. '~~~~', '----', '____')
  cleaned = cleaned.replace(/[~^|_\\]{2,}/g, ' ');

  // 11. Collapse tabs, non-breaking spaces, and duplicate spaces
  cleaned = cleaned.replace(/[ \t\u00a0\u200b]+/g, ' ');

  return cleaned.trim();
}

/**
 * Extracts ONLY the concise information directly related to the searched query/keyword.
 * Instead of dumping the entire chunk, selects the best matching sentence or focused window.
 */
export function getFocusedKeywordSnippet(text: string, query: string, maxChars = 200): string {
  const cleaned = cleanText(text);
  if (!cleaned) return '';

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    if (cleaned.length <= maxChars) return cleaned;
    const truncated = cleaned.slice(0, maxChars).replace(/\s+\S*$/, '');
    return `${truncated}...`;
  }

  // Extract meaningful query keywords (ignoring short stopwords)
  const queryTokens = (cleanQuery.match(/\b\w+\b/g) || [])
    .filter((tok) => !COMMON_STOPWORDS.has(tok) && tok.length > 1);
  const keywords = queryTokens.length > 0 ? queryTokens : (cleanQuery.match(/\b\w+\b/g) || []);

  // Split into sentences
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    sentences.push(cleaned);
  }

  // Find the sentence with the highest match score
  let bestIdx = -1;
  let bestScore = 0;

  sentences.forEach((sent, idx) => {
    const sentLower = sent.toLowerCase();
    let score = 0;

    // Bonus for exact query phrase match
    if (sentLower.includes(cleanQuery)) {
      score += 15;
    }

    // Points for individual keyword matches
    keywords.forEach((kw) => {
      if (sentLower.includes(kw)) {
        score += 2;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  // If a sentence containing the keyword was found:
  if (bestIdx !== -1 && bestScore > 0) {
    let chosen = sentences[bestIdx];

    // If the sentence is short and there's a next sentence, append it if within limit
    if (chosen.length < 90 && bestIdx + 1 < sentences.length) {
      const nextSent = sentences[bestIdx + 1];
      if (chosen.length + nextSent.length + 1 <= maxChars) {
        chosen = `${chosen} ${nextSent}`;
      }
    }

    // If chosen text exceeds maxChars, center a focused window around the keyword
    if (chosen.length > maxChars) {
      const chosenLower = chosen.toLowerCase();
      let matchPos = chosenLower.indexOf(cleanQuery);
      if (matchPos === -1) {
        for (const kw of keywords) {
          const p = chosenLower.indexOf(kw);
          if (p !== -1) {
            matchPos = p;
            break;
          }
        }
      }

      if (matchPos !== -1) {
        const halfWindow = Math.floor((maxChars - 30) / 2);
        let start = Math.max(0, matchPos - halfWindow);
        let end = Math.min(chosen.length, matchPos + halfWindow + 30);

        // Adjust to word boundary
        if (start > 0) {
          const nextSpace = chosen.indexOf(' ', start);
          if (nextSpace !== -1 && nextSpace < matchPos) {
            start = nextSpace + 1;
          }
        }
        if (end < chosen.length) {
          const prevSpace = chosen.lastIndexOf(' ', end);
          if (prevSpace !== -1 && prevSpace > matchPos) {
            end = prevSpace;
          }
        }

        const cropped = chosen.slice(start, end).trim();
        const prefix = start > 0 ? '... ' : '';
        const suffix = end < chosen.length ? ' ...' : '';
        return `${prefix}${cropped}${suffix}`.trim();
      }

      const truncated = chosen.slice(0, maxChars).replace(/\s+\S*$/, '');
      return `${truncated}...`;
    }

    const prefix = bestIdx > 0 ? '... ' : '';
    const suffix = bestIdx < sentences.length - 1 ? ' ...' : '';
    return `${prefix}${chosen}${suffix}`.trim();
  }

  // Fallback if no exact sentence matched:
  if (cleaned.length <= maxChars) return cleaned;
  const truncated = cleaned.slice(0, maxChars).replace(/\s+\S*$/, '');
  return `${truncated}...`;
}

/**
 * Highlights matched keywords with a subtle, professional amber badge
 */
export function renderHighlightedText(snippet: string, query: string): React.ReactNode {
  if (!snippet || !query.trim()) {
    return snippet;
  }

  const cleanQuery = query.trim();
  const queryTokens = (cleanQuery.match(/\b\w+\b/g) || [])
    .filter((tok) => !COMMON_STOPWORDS.has(tok.toLowerCase()) && tok.length > 1);

  const keywords = queryTokens.length > 0 ? queryTokens : (cleanQuery.match(/\b\w+\b/g) || []);
  if (keywords.length === 0) {
    return snippet;
  }

  // Build regex matching query phrase and individual keywords
  const escaped = [
    cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    ...keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  ];
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = snippet.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isMatch = keywords.some(
          (kw) => kw.toLowerCase() === part.toLowerCase() || cleanQuery.toLowerCase() === part.toLowerCase()
        );
        if (isMatch) {
          return (
            <mark
              key={i}
              className="bg-amber-100 text-amber-900 font-semibold px-1 py-0.5 rounded"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
