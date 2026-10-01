import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { QueryHistoryItem } from '../types';
import {
  History,
  Trash2,
  HelpCircle,
  Clock,
  ArrowRight,
  FileText,
  RefreshCw,
} from 'lucide-react';

export const QueryHistoryPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const histCacheKey = user?.email ? `nexus_history_${user.email}` : 'nexus_history_guest';

  const { data: history = [], isLoading } = useQuery<QueryHistoryItem[]>({
    queryKey: ['query-history', user?.email],
    queryFn: async () => {
      const hist = await api.getHistory(0, 100);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHistoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-history'] });
      queryClient.invalidateQueries({ queryKey: ['query-history', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['query-history', user?.email, 0, 10] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.clearAllHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-history'] });
      queryClient.invalidateQueries({ queryKey: ['query-history', 0, 5] });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
          <History className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Query &amp; Research History
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Sign in to view your previous queries, research questions, and cited answers.
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question History</h1>
          <p className="text-sm text-slate-500">
            Review previous questions you have asked and answers provided by NEXUS.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear your entire question history?')) {
                clearAllMutation.mutate();
              }
            }}
            className="btn-outline !text-xs !py-1.5 text-rose-600 hover:text-rose-700 hover:border-rose-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All History
          </button>
        )}
      </div>

      {/* History List */}
      {isLoading ? (
        <div className="card p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Loading question history...
        </div>
      ) : history.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <History className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No previous questions</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Questions you ask will appear here with preview snippets and references to the sources used.
          </p>
          <div className="pt-2">
            <Link to="/ask" className="btn-primary !text-xs !py-1.5">
              Ask your first question
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="card p-5 space-y-3 card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {item.query_text}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.citations_count > 0 && (
                      <span className="badge badge-neutral">
                        <FileText className="w-3 h-3 text-slate-500" />
                        {item.citations_count} {item.citations_count === 1 ? 'source' : 'sources'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate('/ask', { state: { query: item.query_text } })}
                    className="btn-outline !py-1 !px-2.5 !text-xs"
                    title="Ask this question again"
                  >
                    <span>View / Re-ask</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                    title="Delete item from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Answer Snippet Preview */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                {item.response_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
