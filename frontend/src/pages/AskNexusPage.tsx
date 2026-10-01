import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { RAGResponse, Citation } from '../types';
import { CitationModal } from '../components/CitationModal';
import {
  HelpCircle,
  FileText,
  Video,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Send,
  Lock,
} from 'lucide-react';

export const AskNexusPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const initialQuery = (location.state as any)?.query || '';

  const [question, setQuestion] = useState(initialQuery);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const exampleQuestions = [
    'Summarize the main points and key takeaways.',
    'What are the primary recommendations or conclusions?',
    'What deadlines, dates, or milestones are mentioned?',
    'Explain the most important concepts described in the files.',
  ];

  const handleAsk = async (queryToAsk: string = question) => {
    if (!queryToAsk.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const resp = await api.askNexus({
        query: queryToAsk,
        mode: 'ranked',
        top_k: 5,
      });
      setResponse(resp);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Something went wrong while generating an answer. Your documents are still safe.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render text with clickable citation links [1], [2]
  const renderFormattedAnswer = (text: string, citations: Citation[]) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationIdx = parseInt(match[1], 10);
        const cit = citations.find((c) => c.citation_index === citationIdx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (cit) setSelectedCitation(cit);
            }}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            title={cit ? `View Source: ${cit.document_title}` : 'Source citation'}
          >
            [{citationIdx}]
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
          <HelpCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Ask NEXUS Research Assistant
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Sign in to ask questions grounded directly in your uploaded technical documentation with verified citations.
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
      <div className="space-y-1 pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Ask questions about your documents
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Ask questions in natural language. Answers are verified with exact citations.
        </p>
      </div>

      {/* Question Form */}
      <div className="card p-4 sm:p-5 space-y-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="space-y-3"
        >
          <div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  handleAsk();
                }
              }}
              rows={3}
              placeholder="Ask any question in plain English (e.g. 'What are the main takeaways?')..."
              className="form-input resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400">
              Press Ctrl+Enter to submit
            </span>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="btn-primary !py-2 !px-5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Finding Answer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Question
                </>
              )}
            </button>
          </div>
        </form>

        {/* Clickable Example Questions */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Example questions
          </div>
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuestion(ex);
                  handleAsk(ex);
                }}
                className="text-xs px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to answer</p>
            <p className="text-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Answer and Sources Display */}
      {response && (
        <div className="space-y-6">
          {/* Answer Card */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Answer
                </span>
                {response.sufficient_evidence && (
                  <span className="badge badge-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Grounded in Knowledge Base
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-400">
                Answered in {response.latency_ms.toFixed(0)}ms
              </span>
            </div>

            {/* Answer Content */}
            <div className="text-sm text-slate-800 leading-relaxed font-sans space-y-3">
              <p className="whitespace-pre-line">
                {renderFormattedAnswer(response.answer, response.citations)}
              </p>
            </div>
          </div>

          {/* Sources Section */}
          {response.citations && response.citations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Sources Used ({response.citations.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Click a source to inspect the exact passage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {response.citations.map((c) => (
                  <div
                    key={c.citation_index}
                    onClick={() => setSelectedCitation(c)}
                    className="card p-4 space-y-2 card-hover cursor-pointer border-slate-200"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                        <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {c.citation_index}
                        </span>
                        {c.source_type === 'youtube' ? (
                          <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate">{c.document_title}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      "{c.snippet}"
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100">
                      {c.section && <span>{c.section}</span>}
                      {c.page_number && <span>Page {c.page_number}</span>}
                      {c.timestamp_seconds && <span>Time: {c.timestamp_seconds}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citation Modal */}
      {selectedCitation && (
        <CitationModal
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
};
