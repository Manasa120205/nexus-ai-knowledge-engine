import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Search,
  HelpCircle,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface UserTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Upload Your Documents',
    badge: 'Step 1: Ingest',
    description:
      'Start by uploading your PDF manuals, technical papers, text notes, or pasting a YouTube video link. NEXUS automatically parses and organizes the content.',
    tip: 'Your documents remain 100% private to your account.',
    renderPreview: () => (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="border-2 border-dashed border-slate-300 bg-white rounded-lg p-5 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-800">
            Drag &amp; drop your files here
          </div>
          <div className="text-[11px] text-slate-500">
            Supports PDF, Markdown, TXT, or YouTube links
          </div>
        </div>
        <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-800">Architecture_Spec.pdf</span>
            <span className="text-[10px] text-slate-400">• 1.4 MB</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Ready (14 sections)
          </span>
        </div>
      </div>
    ),
  },
  {
    step: 2,
    title: 'Search Terms Instantly',
    badge: 'Step 2: Search',
    description:
      'Search across all your documents in milliseconds. Autocomplete suggests keywords as you type, finding exact terms, function names, and concepts.',
    tip: 'Sub-second lookup saves you from manually browsing hundreds of pages.',
    renderPreview: () => (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="bg-white border border-slate-300 rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-800 font-medium">write-ahead log</span>
          <span className="ml-auto text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200">
            8 results (12ms)
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">StorageEngine.pdf</span>
            <span>Page 4</span>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed">
            "...the <mark className="bg-amber-100 text-amber-900 px-1 rounded font-medium">write-ahead log (WAL)</mark> guarantees durability before changes are committed to disk..."
          </p>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    title: 'Ask Research Questions',
    badge: 'Step 3: Ask',
    description:
      'Ask questions in plain English just like asking a research colleague. NEXUS reads the relevant passages across your files to formulate an answer.',
    tip: 'You can ask broad summaries or deep technical inquiries.',
    renderPreview: () => (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="bg-white border border-slate-300 rounded-lg p-3 text-xs space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Your Question
          </div>
          <div className="text-slate-800 font-medium text-xs">
            "What happens during leader failure in the consensus protocol?"
          </div>
          <div className="flex justify-end">
            <span className="bg-blue-600 text-white text-[11px] px-3 py-1 rounded-md font-medium">
              Ask Question
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Inspect Verified Citations',
    badge: 'Step 4: Verify',
    description:
      'Answers are strictly grounded in your files. Clickable citations like [1] and [2] allow you to inspect the exact page and paragraph source.',
    tip: 'Zero guesswork: every statement is verified with source evidence.',
    renderPreview: () => (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Grounded in Knowledge Base</span>
          </div>
          <p className="text-slate-800 text-xs leading-relaxed">
            When a leader fails, a follower initiates a new election term{' '}
            <span className="inline-flex items-center px-1.5 py-0.2 bg-blue-50 text-blue-700 font-semibold rounded text-[11px] border border-blue-200">
              [1]
            </span>
            . The candidate requesting votes must have an up-to-date log{' '}
            <span className="inline-flex items-center px-1.5 py-0.2 bg-blue-50 text-blue-700 font-semibold rounded text-[11px] border border-blue-200">
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

export const UserTourModal: React.FC<UserTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Prevent background scrolling completely while modal is open
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  if (!isOpen) return null;

  const stepData = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('nexus_tour_seen', 'true');
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          localStorage.setItem('nexus_tour_seen', 'true');
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain"
      style={{ touchAction: 'none' }}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[88vh] overscroll-contain"
        style={{ touchAction: 'auto' }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
              ?
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                How NEXUS Works
              </h2>
              <p className="text-[11px] text-slate-500">
                Step-by-step user guide
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('nexus_tour_seen', 'true');
              onClose();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - scrolls smoothly inside without affecting background */}
        <div
          className="p-6 space-y-4 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              {stepData.badge}
            </span>
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'w-6 bg-blue-600'
                      : i < currentStep
                      ? 'bg-slate-400'
                      : 'bg-slate-200'
                  }`}
                  title={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {stepData.title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {stepData.description}
            </p>
          </div>

          {/* Visual Interactive Preview */}
          <div className="py-1">
            {stepData.renderPreview()}
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="font-semibold text-slate-700">Pro Tip: </span>
            {stepData.tip}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={`btn-outline !text-xs !py-1.5 !px-3 flex items-center gap-1 ${
              isFirst ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.setItem('nexus_tour_seen', 'true');
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="btn-primary !text-xs !py-1.5 !px-4 flex items-center gap-1"
            >
              {isLast ? (
                <>
                  <span>Got it, let's start!</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
