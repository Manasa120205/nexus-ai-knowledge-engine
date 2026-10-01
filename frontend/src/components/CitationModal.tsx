import React, { useEffect } from 'react';
import { Citation } from '../types';
import { X, FileText, Video, Bookmark, Hash, Clock, CheckCircle } from 'lucide-react';
import { cleanText } from '../utils/textUtils';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, onClose }) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (citation) {
      const originalOverflow = document.body.style.overflow;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = '';
      };
    }
  }, [citation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!citation) return null;

  const isYouTube = citation.source_type === 'youtube' || !!citation.timestamp_seconds;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain"
      style={{ touchAction: 'none' }}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh] overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-title"
        style={{ touchAction: 'auto' }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-200">
              [{citation.citation_index}]
            </span>
            <div className="flex items-center gap-2">
              {isYouTube ? (
                <Video className="w-4 h-4 text-rose-500" />
              ) : (
                <FileText className="w-4 h-4 text-blue-600" />
              )}
              <h2 id="citation-title" className="text-sm font-semibold text-slate-900 truncate max-w-md">
                {citation.document_title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close citation details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Subtitle */}
        <div className="px-6 py-2.5 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-800 flex items-center gap-1.5 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>This is the verified source information used to support your answer.</span>
        </div>

        {/* Metadata Badges */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap gap-2 text-xs">
          {citation.section && (
            <span className="badge badge-neutral">
              <Bookmark className="w-3 h-3 text-slate-500" />
              Section: {citation.section}
            </span>
          )}
          {citation.page_number && (
            <span className="badge badge-neutral">
              <Hash className="w-3 h-3 text-slate-500" />
              Page {citation.page_number}
            </span>
          )}
          {citation.timestamp_seconds !== undefined && citation.timestamp_seconds !== null && (
            <span className="badge badge-neutral">
              <Clock className="w-3 h-3 text-rose-500" />
              Timestamp: {Math.floor(citation.timestamp_seconds / 60)}:{(citation.timestamp_seconds % 60).toFixed(0).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-3" onWheel={(e) => e.stopPropagation()}>
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Source Passage Excerpt
          </div>
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-sm leading-relaxed text-slate-800 font-sans whitespace-pre-wrap">
            {cleanText(citation.snippet)}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="btn-outline !text-xs !py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
