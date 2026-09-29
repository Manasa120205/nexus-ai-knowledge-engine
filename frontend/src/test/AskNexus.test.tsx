import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AskNexusPage } from '../pages/AskNexusPage';
import { api } from '../api/client';

describe('AskNexusPage Component', () => {
  it('renders research question interface and displays grounded response with citations', async () => {
    vi.spyOn(api, 'askNexus').mockResolvedValue({
      query: 'How does Raft handle leader election?',
      answer: 'Raft uses randomized election timeouts to ensure split votes are rare and resolved quickly [1].',
      citations: [
        {
          citation_index: 1,
          chunk_id: 'chk-raft-1',
          document_id: 'doc-raft',
          document_title: 'Distributed Consensus and Raft',
          section: 'Leader Election',
          page_number: 2,
          snippet: 'Raft uses randomized election timeouts typically 150-300ms to ensure split votes are resolved quickly.',
          source_type: 'markdown',
        },
      ],
      latency_ms: 12.4,
      retrieval_latency_ms: 1.2,
      generation_latency_ms: 11.2,
      cache_hit: false,
      mode: 'ranked',
      model_used: 'local-grounded-synthesizer',
      sufficient_evidence: true,
    });

    localStorage.setItem('nexus_access_token', 'mock_token');

    render(
      <BrowserRouter>
        <AskNexusPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Ask questions about your documents/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Ask any question/i);
    fireEvent.change(textarea, { target: { value: 'How does Raft handle leader election?' } });

    const askBtn = screen.getByRole('button', { name: /Ask Question/i });
    fireEvent.click(askBtn);

    // Verify grounded answer rendered
    const evidenceBadge = await screen.findByText(/Grounded in Knowledge Base/i);
    expect(evidenceBadge).toBeInTheDocument();

    // Check citation badge [1]
    const citationBtns = screen.getAllByRole('button', { name: /\[1\]/ });
    expect(citationBtns.length).toBeGreaterThanOrEqual(1);

    // Click inline citation badge to open CitationModal
    fireEvent.click(citationBtns[0]);
    expect(await screen.findByText(/Source Passage Excerpt/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Distributed Consensus and Raft/i).length).toBeGreaterThanOrEqual(1);
  });
});
