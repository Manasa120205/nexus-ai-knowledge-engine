import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  CheckCircle2,
  FileText,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PipelineExplainer } from '../components/PipelineExplainer';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span>AI Technical Knowledge Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Your technical files,{' '}
          <span className="text-indigo-600">instant &amp; cited.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          Upload manuals, papers, and transcripts. Search instantly and get answers verified with exact page citations.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="btn-primary !py-3 !px-7 !text-sm !font-semibold"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="btn-primary !py-3 !px-7 !text-sm !font-semibold"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <Link
                to="/login"
                className="btn-outline !py-3 !px-7 !text-sm !font-semibold"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Direct Animated Pipeline Demonstration */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <PipelineExplainer />
        </div>
      </section>

      {/* 3 Simple Steps */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-1 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">How it works</h2>
          <p className="text-xs sm:text-sm text-slate-500">Three simple steps from document to cited answer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-5 space-y-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
              1
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Upload Knowledge</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Add PDFs, text, or YouTube links. Documents are parsed and chunked cleanly.
            </p>
          </div>

          <div className="card p-5 space-y-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
              2
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Search or Ask</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Query exact technical terms or ask natural questions with instant autocomplete.
            </p>
          </div>

          <div className="card p-5 space-y-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
              3
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Grounded Answer</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Get answers backed by direct clickable citations pointing to the exact page.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Benefits */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-6 sm:p-8 bg-slate-50 border-slate-200 rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <Search className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Sub-second Search</h4>
              <p className="text-xs text-slate-500">
                Find exact terms, tokens, and error codes in under 20ms.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Natural Language</h4>
              <p className="text-xs text-slate-500">
                Ask questions naturally without rigid syntax.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Verified Citations</h4>
              <p className="text-xs text-slate-500">
                Every answer links directly to the original passage.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Hybrid Retrieval</h4>
              <p className="text-xs text-slate-500">
                Combines BM25 exact match with semantic vector ranking.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <Database className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Structured Organization</h4>
              <p className="text-xs text-slate-500">
                Manage documents, chunks, and metadata in one clean view.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Isolated &amp; Private</h4>
              <p className="text-xs text-slate-500">
                Your uploaded documents are private to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Minimal CTA */}
      <section className="text-center max-w-md mx-auto px-4 py-4 space-y-3">
        <h3 className="text-xl font-bold text-slate-900">Ready to get started?</h3>
        <p className="text-xs text-slate-500">
          Upload your technical files and search across them in seconds.
        </p>
        <div className="pt-1">
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="btn-primary !py-2.5 !px-6 !text-xs !font-semibold"
          >
            {isAuthenticated ? "Open Dashboard" : "Create Free Account"}
          </Link>
        </div>
      </section>
    </div>
  );
};
