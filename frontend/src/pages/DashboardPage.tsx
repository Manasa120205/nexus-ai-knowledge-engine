import React, { useState } from 'react';
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
  AlertCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { UserTourModal } from '../components/UserTourModal';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [showTourModal, setShowTourModal] = useState(false);

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
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
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
      {/* Top Welcome Banner with Separate Dedicated Help Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Knowledge workspace and retrieval overview.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTourModal(true)}
          className="btn-outline !text-xs !py-1.5 !px-3 self-start sm:self-auto flex items-center gap-1.5 text-slate-700 hover:text-blue-700 border-slate-300 transition-colors"
          title="Open NEXUS User Guide"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Help &amp; Guide</span>
        </button>
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

      {/* Corporate IT Metric Counters */}
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

      {/* Main Workspace Actions */}
      {!hasDocuments ? (
        /* Clean Empty State */
        <div className="card p-8 sm:p-10 border-slate-200 bg-white text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-slate-700" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">No documents in your workspace yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a technical PDF or add a YouTube transcript to start searching keywords and asking questions.
            </p>
          </div>

          <div>
            <Link to="/documents" className="btn-primary !py-2.5 !px-5 !text-sm">
              <Upload className="w-4 h-4 mr-2" />
              Add Knowledge
            </Link>
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
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">
                    Ask a Question
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask questions across all indexed documents with verifiable citations.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
                  Ask now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>

              <Link
                to="/search"
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">
                    Search Knowledge
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Search for specific error messages, functions, or technical topics.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
                  Search docs <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>

              <Link
                to="/documents"
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">
                    Add Knowledge
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload new PDF files, technical notes, or video transcripts.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
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
                <Link to="/history" className="text-xs font-medium text-blue-600 hover:text-blue-700">
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
                        className="text-sm font-medium text-slate-900 hover:text-blue-600"
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

      {/* User Guide Modal triggered on demand via Help & Guide button */}
      <UserTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </div>
  );
};
