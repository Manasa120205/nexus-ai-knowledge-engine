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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium border border-slate-200"
        title="View match score breakdown"
      >
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span>Match: {(score * 100).toFixed(0)}%</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5 text-xs text-slate-700 animate-in fade-in duration-150">
          <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] pb-1.5 border-b border-slate-100">
            Relevance Factors
          </div>
          {semanticScore !== undefined && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Meaning & Topic:</span>
              <span className="font-semibold text-blue-600">{(semanticScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {keywordScore !== undefined && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Exact Word Match:</span>
              <span className="font-semibold text-blue-600">{(keywordScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {titleScore !== undefined && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Document Title Match:</span>
              <span className="font-semibold text-blue-600">{(titleScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {freshnessScore !== undefined && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Recent Updates:</span>
              <span className="font-semibold text-blue-600">{(freshnessScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
