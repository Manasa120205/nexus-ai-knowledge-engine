import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface ScoreBreakdownProps {
  score: number;
  semanticScore?: number;
  keywordScore?: number;
  titleScore?: number;
  freshnessScore?: number;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  score,
  semanticScore,
  keywordScore,
  titleScore,
  freshnessScore,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 text-teal-300 hover:bg-slate-700 transition-colors font-mono border border-slate-700"
        title="View custom ranking score breakdown"
      >
        <Layers className="w-3 h-3 text-teal-400" />
        <span>Rank Score: {(score * 100).toFixed(1)}%</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-2.5 rounded-md bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px] text-slate-300 animate-in fade-in duration-150">
          <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800">
            Multi-Factor Score Weights
          </div>
          {semanticScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Semantic Vector:</span>
              <span className="text-teal-400">{(semanticScore * 100).toFixed(1)}%</span>
            </div>
          )}
          {keywordScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">BM25 Keyword:</span>
              <span className="text-teal-400">{(keywordScore * 100).toFixed(1)}%</span>
            </div>
          )}
          {titleScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Title Match:</span>
              <span className="text-teal-400">{(titleScore * 100).toFixed(1)}%</span>
            </div>
          )}
          {freshnessScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Freshness Decay:</span>
              <span className="text-teal-400">{(freshnessScore * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
