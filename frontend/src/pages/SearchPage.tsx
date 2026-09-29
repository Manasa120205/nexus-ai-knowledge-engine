import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { SearchResultItem, AutocompleteSuggestion, Citation } from '../types';
import { CitationModal } from '../components/CitationModal';
import { PipelineExplainer } from '../components/PipelineExplainer';
import {
  Search,
  FileText,
  Video,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'ranked' | 'hybrid' | 'keyword' | 'vector'>('ranked');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);

  // Autocomplete Trie state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Debounced Trie autocomplete
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsAutocompleteOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const resp = await api.autocomplete(query, 6);
        setSuggestions(resp.suggestions);
        setIsAutocompleteOpen(resp.suggestions.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setIsAutocompleteOpen(false);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const resp = await api.search({
        query: searchQuery,
        mode,
        top_k: 8,
      });
      setResults(resp.results);
      setLatencyMs(resp.latency_ms);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openSourceModal = (item: SearchResultItem, index: number) => {
    const citation: Citation = {
      citation_index: index + 1,
      chunk_id: item.chunk_id,
      document_id: item.document_id,
      document_title: item.document_title,
      page_number: item.page_number,
      timestamp_seconds: item.timestamp_seconds,
      section: item.section,
      snippet: item.text,
      source_type: item.source_type,
    };
    setSelectedCitation(citation);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900">
          Search your knowledge
        </h1>
        <p className="text-sm text-slate-500">
          Find exact terms, technical concepts, or paragraphs across your uploaded documents.
        </p>
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowExplainerModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>How does NEXUS search work? (Watch Animated Walkthrough)</span>
          </button>
        </div>
      </div>

      {/* Main Search Input Box */}
      <div className="card p-2 sm:p-3 relative shadow-md" ref={autocompleteRef}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setIsAutocompleteOpen(true);
              }}
              placeholder="Type any word or phrase from your documents (e.g. storage, consensus, budget, raft)..."
              className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="btn-primary !py-2.5 !px-5 whitespace-nowrap"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Real-time Autocomplete Dropdown */}
        {isAutocompleteOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-30">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Suggested completions
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item.word);
                  handleSearch(item.word);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.word}</span>
                </div>
                <span className="text-[11px] text-slate-400">Search</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optional Mode Toggle */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide search options' : 'Search options'}</span>
        </button>

        {hasSearched && !isLoading && (
          <span>
            {results.length} results found in {latencyMs.toFixed(1)}ms
          </span>
        )}
      </div>

      {showAdvanced && (
        <div className="card p-4 bg-slate-50 border-slate-200 text-xs flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-700">Search Mode:</span>
          <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setMode('ranked')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'ranked' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Smart Ranked (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode('hybrid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'hybrid' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => setMode('keyword')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'keyword' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exact Keyword
            </button>
            <button
              type="button"
              onClick={() => setMode('vector')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'vector' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Conceptual
            </button>
          </div>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="card p-8 text-center text-sm text-slate-500">
            Searching your documents...
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="card p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">No matching results found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find matches for "{query}". Try checking your spelling, using broader keywords, or uploading more documents.
            </p>
          </div>
        )}

        {!isLoading &&
          results.map((item, index) => (
            <div key={item.chunk_id || index} className="card p-5 space-y-2 card-hover">
              {/* Top Source Meta */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  {item.source_type === 'youtube' ? (
                    <Video className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span>{item.document_title}</span>
                  {item.section && <span className="text-slate-400">&bull; {item.section}</span>}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {item.page_number && <span>Page {item.page_number}</span>}
                  {item.timestamp_seconds && <span>Time: {item.timestamp_seconds}s</span>}
                </div>
              </div>

              {/* Text Snippet */}
              <p className="text-sm text-slate-800 leading-relaxed">
                {item.text}
              </p>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => openSourceModal(item, index)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <span>View Full Source</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Citation Source Modal */}
      {selectedCitation && (
        <CitationModal
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}

      {/* Pipeline Explainer Modal */}
      {showExplainerModal && (
        <PipelineExplainer isModal onClose={() => setShowExplainerModal(false)} />
      )}
    </div>
  );
};
