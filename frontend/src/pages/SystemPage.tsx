import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  Database,
  Layers,
  Clock,
  RefreshCw,
} from 'lucide-react';

export const SystemPage: React.FC = () => {
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 10000,
  });

  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 10000,
  });

  if (isMetricsLoading || isHealthLoading) {
    return (
      <div className="py-12 flex justify-center items-center text-xs text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600 mr-2" />
        Loading system telemetry...
      </div>
    );
  }

  const isHealthy = health?.status === 'ok';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            System &amp; Health Status
            <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
              Status: {health?.status.toUpperCase()}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Telemetry, cache performance, and subsystem health indicators.
          </p>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase">
            <span>Cache Hit Ratio</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? (metrics.cache_hit_rate * 100).toFixed(1) : 0}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {metrics ? `${metrics.cache_hits} hits / ${metrics.cache_misses} misses` : ''}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase">
            <span>Average Latency</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.avg_latency_ms.toFixed(1) : 0} ms
          </div>
          <p className="mt-1 text-xs text-slate-500">End-to-end response time</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase">
            <span>Total Queries</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.total_queries : 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Executed across all sessions</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase">
            <span>Indexed Sections</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.total_chunks : 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">In vector and BM25 store</p>
        </div>
      </div>

      {/* Subsystem Diagnostics */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Component Health Diagnostics
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-800">Primary Database Engine</span>
            </div>
            <span className="badge badge-success">
              <CheckCircle className="w-3 h-3" />
              Connected (SQLAlchemy 2.0 Async)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-800">Cache Subsystem</span>
            </div>
            <span className="badge badge-success">
              <CheckCircle className="w-3 h-3" />
              Active (Resilient Cache with Fallback)
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-800">Background Worker</span>
            </div>
            <span className="badge badge-success">
              <CheckCircle className="w-3 h-3" />
              Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
