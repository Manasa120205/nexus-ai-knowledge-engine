import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { EvaluationMetricSummary } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Sliders,
  HelpCircle,
} from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeMetric, setActiveMetric] = useState<'ir' | 'rag' | 'latency'>('ir');

  // Fetch latest recorded benchmark metrics
  const { data: latestMetrics = [], isLoading } = useQuery({
    queryKey: ['evaluation-metrics'],
    queryFn: () => api.getLatestEvaluationMetrics(10),
  });

  // Run benchmark mutation
  const runMutation = useMutation({
    mutationFn: () =>
      api.runEvaluation({
        modes: ['vector', 'keyword', 'hybrid', 'ranked'],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-metrics'] });
    },
  });

  // Prepare chart data
  const chartData = latestMetrics.map((m) => ({
    mode: m.mode.toUpperCase(),
    'Recall@5': parseFloat((m.recall_at_k * 100).toFixed(1)),
    'Precision@5': parseFloat((m.precision_at_k * 100).toFixed(1)),
    'MRR': parseFloat((m.mrr * 100).toFixed(1)),
    'nDCG@5': parseFloat((m.ndcg * 100).toFixed(1)),
    'Groundedness': parseFloat((m.groundedness_score * 100).toFixed(1)),
    'Citation Acc': parseFloat((m.citation_accuracy * 100).toFixed(1)),
    'Retrieval (ms)': parseFloat(m.retrieval_latency_ms.toFixed(1)),
    'Total Latency (ms)': parseFloat(m.total_latency_ms.toFixed(1)),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Evaluation &amp; Benchmarks
            <span className="badge badge-info">50 Benchmark Questions</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Empirical comparison of Vector, Keyword (BM25), Hybrid (RRF), and Custom Ranked retrieval on genuine metrics.
          </p>
        </div>

        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="btn-primary"
        >
          {runMutation.isPending ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              Evaluating 50 Questions...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Run Benchmark
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-sm text-slate-500">
          Loading benchmark results...
        </div>
      ) : latestMetrics.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-800">No evaluation runs recorded yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Run Benchmark" above to evaluate Vector, BM25, Hybrid RRF, and Custom Ranking pipelines against the 50-question technical dataset.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart View Toggle */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Metric Group:</span>
            <button
              onClick={() => setActiveMetric('ir')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeMetric === 'ir'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              IR Metrics (Recall, Precision, MRR, nDCG)
            </button>
            <button
              onClick={() => setActiveMetric('rag')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeMetric === 'rag'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              RAG Metrics (Groundedness, Citation Acc)
            </button>
            <button
              onClick={() => setActiveMetric('latency')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeMetric === 'latency'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Latency (ms)
            </button>
          </div>

          {/* Visual Bar Chart */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">
              {activeMetric === 'ir' && 'Information Retrieval Metrics Comparison (%)'}
              {activeMetric === 'rag' && 'Generation Groundedness & Citation Precision (%)'}
              {activeMetric === 'latency' && 'Retrieval & End-to-End Latency (ms)'}
            </h2>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mode" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {activeMetric === 'ir' && (
                    <>
                      <Bar dataKey="Recall@5" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Precision@5" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="nDCG@5" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {activeMetric === 'rag' && (
                    <>
                      <Bar dataKey="Groundedness" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Citation Acc" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {activeMetric === 'latency' && (
                    <>
                      <Bar dataKey="Retrieval (ms)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Total Latency (ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Granular Summary Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Detailed Evaluation Summary Table
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Pipeline Mode</th>
                    <th className="py-3 px-4 text-center">Recall@5</th>
                    <th className="py-3 px-4 text-center">Precision@5</th>
                    <th className="py-3 px-4 text-center">MRR</th>
                    <th className="py-3 px-4 text-center">nDCG@5</th>
                    <th className="py-3 px-4 text-center">Groundedness</th>
                    <th className="py-3 px-4 text-center">Citation Acc</th>
                    <th className="py-3 px-4 text-right">Retrieval</th>
                    <th className="py-3 px-4 text-right">Total E2E</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestMetrics.map((m, idx) => (
                    <tr key={`${m.mode}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.mode.toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {(m.recall_at_k * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {(m.precision_at_k * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-blue-600">
                        {m.mrr.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-blue-600">
                        {m.ndcg.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600 font-medium">
                        {(m.groundedness_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600 font-medium">
                        {(m.citation_accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {m.retrieval_latency_ms.toFixed(1)}ms
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium">
                        {m.total_latency_ms.toFixed(1)}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
