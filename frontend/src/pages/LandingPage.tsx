import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  Search,
  CheckCircle2,
  FileText,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PipelineExplainer } from '../components/PipelineExplainer';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showPipelineGuide, setShowPipelineGuide] = useState(false);

  return (
    <div className="space-y-14 py-8 sm:py-10">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
          <span>Technical Knowledge Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Your technical knowledge,{' '}
          <span className="text-indigo-600">searchable</span> and easier to understand.
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload your technical documents, search across them instantly, and ask questions to get accurate answers grounded in your own sources.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="btn-primary !py-3 !px-6 !text-base"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="btn-primary !py-3 !px-6 !text-base"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <Link
                to="/login"
                className="btn-outline !py-3 !px-6 !text-base"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 3-Step Simple How It Works Flow */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
          <p className="text-sm text-slate-500">Three simple steps to make your technical resources useful</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="card p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
              1
            </div>
            <h3 className="text-base font-semibold text-slate-900">Add your knowledge</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload PDF manuals, engineering docs, text notes, or link video transcripts. NEXUS reads and organizes the content.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
              2
            </div>
            <h3 className="text-base font-semibold text-slate-900">Search or ask</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Search for exact keywords or ask questions in plain English. Fast autocomplete helps you find topics quickly.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
              3
            </div>
            <h3 className="text-base font-semibold text-slate-900">Get a grounded answer</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Receive clear answers with direct references to the exact page, section, or timestamp where the information originated.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Deep Dive (Collapsible) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-6 border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
                <Layers className="w-3.5 h-3.5" />
                Under the Hood
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Interactive RAG Architecture &amp; Pipeline Deep Dive
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Explore how ingestion, embedding generation, hybrid retrieval, and grounded synthesis work step-by-step.
              </p>
            </div>
            <button
              onClick={() => setShowPipelineGuide(!showPipelineGuide)}
              className="btn-outline text-xs whitespace-nowrap self-start sm:self-center flex items-center gap-1.5"
            >
              {showPipelineGuide ? (
                <>
                  <span>Hide Architecture Guide</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Explore Architecture Guide</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          {showPipelineGuide && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <PipelineExplainer />
            </div>
          )}
        </div>
      </section>

      {/* Why NEXUS Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-8 sm:p-10 bg-slate-50 border-slate-200">
          <div className="max-w-2xl space-y-3 mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Why NEXUS?</h2>
            <p className="text-sm text-slate-600">
              Engineered specifically for engineering documentation, scientific papers, and deep technical references.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Search documents quickly</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Find exact technical tokens, function names, and error codes without manually browsing hundreds of pages.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Ask in natural language</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Phrase questions naturally. NEXUS parses your question and retrieves the relevant technical explanations.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">See where answers came from</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every generated answer includes clickable citations to the exact source paragraphs, ensuring complete accountability.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Keep knowledge organized</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manage all your technical references in one clean workspace, complete with version history and chunk counts.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Search by meaning &amp; terms</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Combines semantic concept understanding with precise keyword matching for complete coverage.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Private &amp; isolated data</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your uploaded documents and search history are strictly isolated to your user account and never shared.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center max-w-xl mx-auto px-4 py-8 space-y-4">
        <h3 className="text-2xl font-bold text-slate-900">Ready to organize your technical knowledge?</h3>
        <p className="text-sm text-slate-600">
          Create an account in seconds and upload your first document.
        </p>
        <div className="pt-2">
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="btn-primary !py-2.5 !px-6"
          >
            {isAuthenticated ? "Open Dashboard" : "Create Free Account"}
          </Link>
        </div>
      </section>
    </div>
  );
};
