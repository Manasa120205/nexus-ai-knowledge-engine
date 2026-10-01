import { describe, it, expect } from 'vitest';
import { cleanText, getFocusedKeywordSnippet } from '../utils/textUtils';

describe('textUtils utility', () => {
  it('cleanText fixes missing spaces, strips unprintable symbols, and handles ligatures', () => {
    // Missing spaces after punctuation
    const rawPunc = 'database.Then,it indexes:documents;completed!';
    expect(cleanText(rawPunc)).toBe('database. Then, it indexes: documents; completed!');

    // Broken symbols and non-printable characters
    const rawSymbols = 'Overview \uf0b7 Item \u2022 \x00\x1f Data \ufffd values';
    const cleaned = cleanText(rawSymbols);
    expect(cleaned).not.toContain('\uf0b7');
    expect(cleaned).not.toContain('\ufffd');
    expect(cleaned).toContain('Overview Item Data values');

    // Missing spaces in parentheses
    const rawParen = 'function(param)returns';
    expect(cleanText(rawParen)).toBe('function (param) returns');

    // Ligatures
    const rawLig = 'The speci\ufb01c and e\ufb00ective algorithm.';
    expect(cleanText(rawLig)).toBe('The specific and effective algorithm.');
  });

  it('getFocusedKeywordSnippet extracts only relevant information for keyword', () => {
    const documentText =
      'System Architecture Introduction. This initial section outlines historical motivation. ' +
      'In distributed consensus, the Raft protocol elects a leader using randomized timeouts between 150ms and 300ms. ' +
      'Subsequent sections describe persistent storage mechanisms and background garbage collection routines.';

    const snippet = getFocusedKeywordSnippet(documentText, 'Raft leader', 180);

    // Verify it extracted ONLY the sentence related to Raft and leader
    expect(snippet).toContain('Raft protocol elects a leader');
    // Ensure it did not dump the entire document
    expect(snippet).not.toContain('historical motivation');
    expect(snippet).not.toContain('garbage collection routines');
  });
});
