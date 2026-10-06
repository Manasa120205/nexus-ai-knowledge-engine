import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            N
          </div>
          <span className="font-semibold text-slate-700">NEXUS</span>
          <span>· Technical Knowledge Retrieval Platform</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/documents" className="hover:text-slate-900 transition-colors">
            Knowledge
          </Link>
          <Link to="/search" className="hover:text-slate-900 transition-colors">
            Search
          </Link>
          <Link to="/ask" className="hover:text-slate-900 transition-colors">
            Ask
          </Link>
          <Link to="/evaluation" className="hover:text-slate-900 transition-colors">
            Benchmarks
          </Link>
          <Link to="/system" className="hover:text-slate-900 transition-colors">
            System Status
          </Link>
        </div>

        <div className="text-slate-400">
          Built for reliability &amp; verifiable source citations.
        </div>
      </div>
    </footer>
  );
};
