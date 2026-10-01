import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { DocumentItem, QueryHistoryItem } from '../types';
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
  Video,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { UserTourModal } from '../components/UserTourModal';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [showTourModal, setShowTourModal] = useState(false);

  // Per-account local cache keys to ensure data is never lost across sessions/restarts
  const docCacheKey = user?.email ? `nexus_docs_${user.email}` : 'nexus_docs_guest';
  const histCacheKey = user?.email ? `nexus_history_${user.email}` : 'nexus_history_guest';

  const {
    data: documents = [],
    isLoading: isDocsLoading,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery<DocumentItem[]>({
    queryKey: ['documents-list', user?.email],
    queryFn: async () => {
      const docs = await api.listDocuments(0, 100);
      if (docs && docs.length > 0 && user?.email) {
        localStorage.setItem(docCacheKey, JSON.stringify(docs));
      }
      return docs;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(docCacheKey);
        return cached ? (JSON.parse(cached) as DocumentItem[]) : ([] as DocumentItem[]);
      } catch {
        return [] as DocumentItem[];
      }
    },
    enabled: isAuthenticated,
  });

  const {
    data: history = [],
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<QueryHistoryItem[]>({
    queryKey: ['query-history', user?.email, 0, 10],
    queryFn: async () => {
      const hist = await api.getHistory(0, 10);
      if (hist && hist.length > 0 && user?.email) {
        localStorage.setItem(histCacheKey, JSON.stringify(hist));
      }
      return hist;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(histCacheKey);
        return cached ? (JSON.parse(cached) as QueryHistoryItem[]) : ([] as QueryHistoryItem[]);
      } catch {
        return [] as QueryHistoryItem[];
      }
    },
    enabled: isAuthenticated,
  });

  // Sync cache with latest fetched data
  useEffect(() => {
    if (documents && documents.length > 0 && user?.email) {
      localStorage.setItem(docCacheKey, JSON.stringify(documents));
    }
  }, [documents, docCacheKey, user?.email]);

  useEffect(() => {
    if (history && history.length > 0 && user?.email) {
      localStorage.setItem(histCacheKey, JSON.stringify(history));
    }
  }, [history, histCacheKey, user?.email]);

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
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Session
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Connected as <span className="font-medium text-slate-700">{user?.email}</span> • Knowledge workspace and retrieval overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTourModal(true)}
            className="btn-outline !text-xs !py-1.5 !px-3 flex items-center gap-1.5 text-slate-700 hover:text-blue-700 border-slate-300 transition-colors"
            title="Open NEXUS User Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Help &amp; Guide</span>
          </button>
        </div>
      </div>

      {/* Polite error alerts */}
      {docsError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Could not refresh documents from server. Showing cached workspace items.</span>
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
            {isDocsLoading && docCount === 0 ? '...' : docCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Indexed in your knowledge workspace</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Questions Asked</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {isHistoryLoading && questionCount === 0 ? '...' : questionCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Grounded queries with citations</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Engine Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            Ready
          </div>
          <p className="mt-1 text-xs text-slate-500">Hybrid BM25 + Vector Retrieval online</p>
        </div>
      </div>

      {/* Quick Action Navigation */}
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

      {/* Knowledge Base Documents in Account */}
      <div className="card p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Knowledge Documents in Workspace</h2>
            <p className="text-xs text-slate-500">
              {docCount} {docCount === 1 ? 'document' : 'documents'} ready for search and RAG synthesis
            </p>
          </div>
          <Link to="/documents" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Manage all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No documents uploaded yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a technical document or PDF to start asking questions against your custom knowledge.
            </p>
            <div className="pt-1">
              <Link to="/documents" className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Add Document
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.slice(0, 5).map((doc) => (
              <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    {doc.source_type === 'youtube' ? (
                      <Video className="w-4 h-4 text-rose-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {doc.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="capitalize">{doc.source_type}</span>
                      <span>•</span>
                      <span>{doc.chunk_count || 1} chunks</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Ready
                  </span>
                  <Link
                    to="/ask"
                    state={{ query: `Tell me about ${doc.title}` }}
                    className="btn-outline !py-1 !px-2.5 !text-xs text-slate-700 hover:text-blue-600"
                    title="Ask against this document"
                  >
                    Ask
                  </Link>
                  <Link
                    to="/search"
                    state={{ query: doc.title }}
                    className="btn-outline !py-1 !px-2.5 !text-xs text-slate-700 hover:text-blue-600"
                    title="Search this document"
                  >
                    Search
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Questions List */}
      <div className="card p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Questions Asked</h2>
            <p className="text-xs text-slate-500">
              {questionCount} {questionCount === 1 ? 'question' : 'questions'} logged with citations
            </p>
          </div>
          <Link to="/history" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all history <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <HelpCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No questions asked yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ask your first question against your documents to get grounded answers with verifiable citations.
            </p>
            <div className="pt-1">
              <Link to="/ask" className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Ask a Question
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <Link
                    to="/ask"
                    state={{ query: item.query_text }}
                    className="text-sm font-semibold text-slate-900 hover:text-blue-600 inline-flex items-center gap-1.5 group"
                  >
                    <span>{item.query_text}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </Link>
                  {item.response_text && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.response_text}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-400">
                    <span className="capitalize px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono">
                      {item.mode}
                    </span>
                    {item.citations_count !== undefined && item.citations_count > 0 && (
                      <span>• {item.citations_count} citations</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Guide Modal triggered on demand via Help & Guide button */}
      <UserTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </div>
  );
};
