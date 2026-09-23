import React from 'react';
import { Zap, Database } from 'lucide-react';

interface LatencyBadgeProps {
  latencyMs: number;
  cacheHit?: boolean;
}

export const LatencyBadge: React.FC<LatencyBadgeProps> = ({ latencyMs, cacheHit }) => {
  const isFast = latencyMs < 100;
  const isModerate = latencyMs >= 100 && latencyMs < 500;

  return (
    <div className="flex items-center gap-2">
      {cacheHit && (
        <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
          <Database className="w-3 h-3" />
          Cache Hit
        </span>
      )}
      <span
        className={`flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border ${
          isFast
            ? 'bg-teal-950/50 text-teal-400 border-teal-800/60'
            : isModerate
            ? 'bg-amber-950/50 text-amber-400 border-amber-800/60'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        <Zap className="w-3 h-3" />
        {latencyMs.toFixed(1)} ms
      </span>
    </div>
  );
};
