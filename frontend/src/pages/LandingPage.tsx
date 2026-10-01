import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  Search,
  CheckCircle2,
  FileText,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  ExternalLink,
  Play,
} from 'lucide-react';
import { UserTourModal } from '../components/UserTourModal';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [tourModalOpen, setTourModalOpen] = useState(false);

  // Auto-prompt tour for first-time visitors
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('nexus_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setTourModalOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const USER_STEPS = [
    {
      id: 0,
      title: '1. Upload Files',
      shortTitle: 'Upload',
      icon: UploadCloud,
      heading: 'Upload your technical documents & notes',
      description:
        'Drag and drop PDF manuals, engineering specs, markdown notes, or paste a YouTube video transcript. Files are instantly parsed into readable sections.',
      renderPreview: () => (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="border-2 border-dashed border-blue-200 bg-white rounded-xl p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Drop your PDF, Markdown, or TXT here
            </div>
            <div className="text-xs text-slate-500">
              Or paste a YouTube link for automated caption extraction
            </div>
          </div>
          <div className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">Distributed_Systems_v2.pdf</span>
              <span className="text-[11px] text-slate-400">• 2.4 MB</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Ready (18 chunks)
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: '2. Search Keywords',
      shortTitle: 'Search',
      icon: Search,
      heading: 'Find exact terms & code tokens in milliseconds',
      description:
        'Search for function names, error codes, or topics across all your uploaded documents with sub-second ranking and real-time autocomplete.',
      renderPreview: () => (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="bg-white border border-slate-300 rounded-lg p-3 flex items-center gap-2.5 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-900 font-medium">write-ahead log durability</span>
            <span className="ml-auto text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-medium">
              8 results in 12ms
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800">Storage_Engines.pdf</span>
              <span className="text-slate-400">Page 7 • Section 2.1</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed">
              "...the <mark className="bg-amber-100 text-amber-900 px-1 rounded font-medium">write-ahead log</mark> guarantees ACID durability by appending transaction changes to persistent disk before memory flush..."
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: '3. Ask in Plain English',
      shortTitle: 'Ask',
      icon: HelpCircle,
      heading: 'Ask research questions naturally',
      description:
        'Phrase technical questions in plain English. NEXUS retrieves relevant passages and synthesizes an answer grounded directly in your files.',
      renderPreview: () => (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="bg-white border border-slate-300 rounded-lg p-3.5 text-xs space-y-2.5 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Your Technical Inquiry
            </div>
            <div className="text-slate-900 font-medium text-xs leading-relaxed">
              "How does leader election handle network partitions in the consensus protocol?"
            </div>
            <div className="flex justify-end pt-1">
              <span className="bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-md shadow-sm">
                Ask Question
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: '4. Verified Citations',
      shortTitle: 'Citations',
      icon: CheckCircle2,
      heading: 'Every statement is backed by verifiable citations',
      description:
        'Zero hallucinations. Every generated answer includes clickable citation references [1], [2] pointing to the exact page and paragraph source.',
      renderPreview: () => (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 text-xs space-y-2 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Grounded in Knowledge Base</span>
            </div>
            <p className="text-slate-800 text-xs leading-relaxed">
              During a partition, the minority cluster cannot achieve a quorum of votes{' '}
              <span className="inline-flex items-center px-1.5 py-0.2 bg-blue-100 text-blue-700 font-semibold rounded text-[11px] border border-blue-200 cursor-pointer">
                [1]
              </span>
              . Once the network recovers, stale leaders step down and replicate logs from the valid leader{' '}
              <span className="inline-flex items-center px-1.5 py-0.2 bg-blue-100 text-blue-700 font-semibold rounded text-[11px] border border-blue-200 cursor-pointer">
                [2]
              </span>
              .
            </p>
            <div className="pt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <span>Click any citation tag to view the exact page</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = USER_STEPS[activeTab];

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>AI Technical Knowledge Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Your technical files,{' '}
          <span className="text-blue-600">instant &amp; cited.</span>
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

          {/* Interactive User Tour Button */}
          <button
            type="button"
            onClick={() => setTourModalOpen(true)}
            className="btn-outline !py-3 !px-5 !text-sm !font-medium text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Interactive Tour</span>
          </button>
        </div>
      </section>

      {/* User-Centric Interactive Showcase: How It Works From Your End */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
                How It Works From Your End
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Simple 4-Step Knowledge Workflow
              </h2>
            </div>
            <button
              onClick={() => setTourModalOpen(true)}
              className="btn-outline !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 self-start sm:self-center"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>Full Interactive Guide</span>
            </button>
          </div>

          {/* Step Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {USER_STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(idx)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                      {s.shortTitle}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    Step {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Step Details & Visual Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            <div className="md:col-span-5 space-y-2">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Step {currentStep.id + 1} of 4
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {currentStep.heading}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentStep.description}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab((prev) => (prev + 1) % USER_STEPS.length)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <span>See next step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="md:col-span-7">
              {currentStep.renderPreview()}
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Benefits */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card p-6 sm:p-8 bg-slate-50 border-slate-200 rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <Search className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Sub-second Search</h4>
              <p className="text-xs text-slate-500">
                Find exact terms, tokens, and error codes in under 20ms.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Natural Language</h4>
              <p className="text-xs text-slate-500">
                Ask questions naturally without rigid syntax.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Verified Citations</h4>
              <p className="text-xs text-slate-500">
                Every answer links directly to the original passage.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Hybrid Retrieval</h4>
              <p className="text-xs text-slate-500">
                Combines BM25 exact match with semantic vector ranking.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <Database className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-slate-900">Structured Organization</h4>
              <p className="text-xs text-slate-500">
                Manage documents, chunks, and metadata in one clean view.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
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

      {/* Global Interactive Tour Modal */}
      <UserTourModal
        isOpen={tourModalOpen}
        onClose={() => setTourModalOpen(false)}
      />
    </div>
  );
};
