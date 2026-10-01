import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { SearchResultItem, AutocompleteSuggestion, Citation } from '../types';
import { CitationModal } from '../components/CitationModal';
import { PipelineExplainer } from '../components/PipelineExplainer';
import {
  Search,
  X,
  FileText,
  Video,
  ArrowRight,
  Clock,
  HelpCircle,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
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

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
          <Search className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Search your Knowledge Base
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Sign in to search across your uploaded documents, manuals, and technical notes with sub-second keyword and semantic ranking.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/login" className="btn-primary !px-6 !py-2.5">
            Sign In
          </Link>
          <Link to="/register" className="btn-outline !px-6 !py-2.5">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Search your knowledge
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Instant keyword and semantic retrieval across all documents.
        </p>
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowExplainerModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How Search Works</span>
          </button>
        </div>
      </div>

      {/* Main Search Input Box */}
      <div className="card p-2 sm:p-2.5 relative shadow-xs" ref={autocompleteRef}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setIsAutocompleteOpen(true);
              }}
              placeholder="Type any word or phrase from your documents..."
              style={{ paddingLeft: '3rem' }}
              className="w-full pr-10 py-2.5 bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setMode('ranked')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'ranked' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Smart Search (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode('hybrid')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'hybrid' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setMode('keyword')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'keyword' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exact Words
            </button>
            <button
              type="button"
              onClick={() => setMode('vector')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'vector' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Meaning & Topic
            </button>
          </div>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-3">
        {!hasSearched && !isLoading && (
          <div className="card p-8 text-center space-y-3 bg-slate-50/60 border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">Ready to search your documents</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Type any function name, technical term, or concept to retrieve relevant excerpts with page references and timestamps.
              </p>
            </div>
          </div>
        )}

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
