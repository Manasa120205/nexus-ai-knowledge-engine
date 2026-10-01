import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  FileText,
  HelpCircle,
  Search,
  Upload,
  ArrowRight,
  Clock,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  Play,
  BookOpen,
} from 'lucide-react';
import { UserTourModal } from '../components/UserTourModal';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [showTourModal, setShowTourModal] = useState(false);

  useEffect(() => {
    const tourSeen = localStorage.getItem('nexus_tour_seen');
    if (!tourSeen) {
      setShowTourModal(true);
    }
  }, []);

  const { data: documents, isLoading: isDocsLoading, error: docsError, refetch: refetchDocs } = useQuery({
    queryKey: ['documents-list'],
    queryFn: () => api.listDocuments(0, 100),
    enabled: isAuthenticated,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['query-history', 0, 5],
    queryFn: () => api.getHistory(0, 5),
    enabled: isAuthenticated,
  });

  const docCount = documents?.length || 0;
  const questionCount = history?.length || 0;
  const hasDocuments = docCount > 0;

  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome to NEXUS
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sign in to upload your files, search for any word, and ask questions to get direct answers with page citations.
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
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Welcome Banner */}
      <div className="space-y-1 pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Knowledge workspace and retrieval overview.
        </p>
      </div>

      {/* Clear Purpose Card: What is NEXUS? */}
      <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              What does this website do?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Instead of reading through long PDF documents, notes, or YouTube videos manually, NEXUS reads them for you.
              Upload any document in the <strong>Knowledge Base</strong>, then go to <strong>Ask NEXUS</strong> to ask questions or look up any word. NEXUS gives you direct answers backed by verified source citations from your files.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
            <span className="text-slate-700"><strong>Knowledge:</strong> Upload your PDFs or text</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
            <span className="text-slate-700"><strong>Search:</strong> Instant keyword search</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
            <span className="text-slate-700"><strong>Ask:</strong> Direct answers & citations</span>
          </div>
        </div>

        {/* User Tour Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Need a quick walkthrough of how you use NEXUS from your end?</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTourModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start Interactive Tour</span>
          </button>
        </div>
      </div>

      {/* Error state with polite retry */}
      {docsError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Something went wrong while loading your documents. Please try again.</span>
          </div>
          <button
            onClick={() => refetchDocs()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-rose-300 text-rose-700 text-xs font-medium hover:bg-rose-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Useful Simple Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {isDocsLoading ? '...' : docCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Indexed in your account</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Questions Asked</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {isHistoryLoading ? '...' : questionCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Queries with citations</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Processing Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {hasDocuments ? 'Ready' : 'Idle'}
          </div>
          <p className="mt-1 text-xs text-slate-500">Search and ask enabled</p>
        </div>
      </div>

      {/* Clear Workflow / Start Here Section */}
      {!hasDocuments ? (
        /* Empty / Onboarding State */
        <div className="card p-8 sm:p-10 border-indigo-100 bg-indigo-50/40 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Start by adding a knowledge source</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload a technical PDF or add a YouTube transcript. Once processed, you can search it or ask questions about it.
            </p>
          </div>

          <div>
            <Link to="/documents" className="btn-primary !py-3 !px-6 !text-base">
              <Upload className="w-4 h-4 mr-2" />
              Add Knowledge
            </Link>
          </div>

          {/* 3 Step Workflow Explanation */}
          <div className="pt-6 border-t border-indigo-100/80 max-w-xl mx-auto">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">
              How it works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs text-slate-600">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-bold text-indigo-600 block mb-1">1. Add knowledge</span>
                Upload your first technical document.
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-bold text-indigo-600 block mb-1">2. NEXUS processes it</span>
                Text is extracted and indexed for fast retrieval.
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-bold text-indigo-600 block mb-1">3. Search or ask</span>
                Ask questions and receive answers with sources.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active State with Quick Actions */
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/ask"
                className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600">
                    Ask a Question
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask questions across all indexed documents with verifiable citations.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600">
                  Ask now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>

              <Link
                to="/search"
                className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600">
                    Search Knowledge
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Search for specific error messages, functions, or technical topics.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600">
                  Search docs <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>

              <Link
                to="/documents"
                className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600">
                    Add Knowledge
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload new PDF files, technical notes, or video transcripts.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-indigo-600">
                  Manage files <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Questions List */}
          {history && history.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h2 className="text-base font-semibold text-slate-900">Recent Questions</h2>
                <Link to="/history" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  View all history &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {history.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Link
                        to="/ask"
                        state={{ query: item.query_text }}
                        className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {item.query_text}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.response_text}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive User Tour Modal */}
      <UserTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </div>
  );
};
