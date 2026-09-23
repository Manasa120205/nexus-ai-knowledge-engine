import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { SearchPage } from '../pages/SearchPage';
import { api } from '../api/client';

describe('SearchPage Component', () => {
  it('renders search input, executes search, and displays results', async () => {
    vi.spyOn(api, 'search').mockResolvedValue({
      query: 'write-ahead log',
      mode: 'ranked',
      total_results: 1,
      latency_ms: 2.5,
      results: [
        {
          chunk_id: 'chk-1',
          document_id: 'doc-1',
          document_title: 'Database Internals: Storage Engines',
          text: 'The Write-Ahead Log (WAL) ensures ACID durability.',
          snippet: 'The Write-Ahead Log (WAL) ensures ACID durability.',
          score: 0.94,
          source_type: 'markdown',
        },
      ],
    });

    render(
      <BrowserRouter>
        <SearchPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Search your knowledge/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Search your knowledge base/i);
    fireEvent.change(input, { target: { value: 'write-ahead log' } });
    expect((input as HTMLInputElement).value).toBe('write-ahead log');

    const searchBtn = screen.getByRole('button', { name: /^Search$/i });
    fireEvent.click(searchBtn);

    const resultDoc = await screen.findByText(/Database Internals: Storage Engines/i);
    expect(resultDoc).toBeInTheDocument();
    expect(screen.getByText(/The Write-Ahead Log \(WAL\) ensures ACID durability\./i)).toBeInTheDocument();
  });
});
