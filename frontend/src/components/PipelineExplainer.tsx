import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  FileText,
  Database,
  Search,
  BookOpen,
  SlidersHorizontal,
  ShieldCheck,
  Check,
  HelpCircle,
} from 'lucide-react';

interface PipelineExplainerProps {
  onClose?: () => void;
  isModal?: boolean;
}

const STAGES = [
  {
    id: 1,
    title: '1. Ingest & Parse',
    shortTitle: '1. Ingest',
    icon: FileText,
    description:
      'Upload PDFs, Markdown, or transcripts. Documents are parsed into clean structured sections.',
    metrics: [
      { label: 'Formats', value: 'PDF, Docs, YouTube' },
      { label: 'Chunking', value: 'Semantic paragraphs' },
      { label: 'Integrity', value: 'Preserves tables' },
    ],
  },
  {
    id: 2,
    title: '2. Dual-Engine Indexing',
    shortTitle: '2. Indexing',
    icon: Database,
    description:
      'Generates BM25 keyword indices and dense semantic embeddings simultaneously for instant lookup.',
    metrics: [
      { label: 'Keyword', value: 'Exact BM25' },
      { label: 'Semantic', value: 'Vector embeddings' },
      { label: 'Latency', value: '< 20ms' },
    ],
  },
  {
    id: 3,
    title: '3. Hybrid Retrieval & Rank',
    shortTitle: '3. Retrieval',
    icon: Search,
    description:
      'Combines reciprocal rank fusion (RRF) and cross-encoder re-ranking for top-5 precision.',
    metrics: [
      { label: 'Method', value: 'Hybrid RRF' },
      { label: 'Ranking', value: 'Cross-encoder' },
      { label: 'Precision', value: 'Top relevant passages' },
    ],
  },
  {
    id: 4,
    title: '4. Grounded Synthesis & Citations',
    shortTitle: '4. Citations',
    icon: CheckCircle2,
    description:
      'Answers are synthesized strictly from retrieved passages, with clickable citations pointing to the exact page.',
    metrics: [
      { label: 'Grounding', value: '100% verified sources' },
      { label: 'Citations', value: 'Clickable page notes' },
      { label: 'Hallucination', value: 'Eliminated' },
    ],
  },
];

const SIMULATED_QUERIES = [
  {
    query: 'What are the main project goals and timelines?',
    bm25Hits: [
      {
        id: 'chunk_1',
        title: 'Project Proposal (Page 2)',
        text: 'The primary goal is delivering the technical engine by Q3, followed by user testing and documentation.',
        score: 'High match',
      },
      {
        id: 'chunk_3',
        title: 'Timeline & Milestones (Page 4)',
        text: 'Key milestone: complete data indexing by June 15 and deploy the search interface.',
        score: 'Strong match',
      },
    ],
    vectorHits: [
      {
        id: 'chunk_1',
        title: 'Project Proposal (Page 2)',
        text: 'The delivery roadmap includes three milestones: prototype, testing, and public release.',
        score: 'Related topic',
      },
      {
        id: 'chunk_6',
        title: 'Executive Summary',
        text: 'Strategic objectives focus on rapid search response times and verifiable source citations.',
        score: 'Related topic',
      },
    ],
    rrfResult: [
      { rank: 1, title: 'Project Proposal (Page 2)', matchType: 'Exact words + Topic match' },
      { rank: 2, title: 'Timeline & Milestones (Page 4)', matchType: 'Exact keyword match' },
      { rank: 3, title: 'Executive Summary', matchType: 'Related topic match' },
    ],
    answer:
      'The primary project goal is completing the engine by Q3, with key milestones for data indexing by June 15 [1]. Testing and public release will follow to ensure verifiable accuracy [2].',
  },
  {
    query: 'Where is the battery safety and charging guide?',
    bm25Hits: [
      {
        id: 'chunk_10',
        title: 'User Manual (Section 4)',
        text: 'Always use the certified 5V/2A power adapter. Do not leave the device charging in direct sunlight.',
        score: 'High match',
      },
      {
        id: 'chunk_12',
        title: 'Safety Guide (Page 8)',
        text: 'Battery protection circuit automatically cuts off charging once capacity reaches 100%.',
        score: 'Strong match',
      },
    ],
    vectorHits: [
      {
        id: 'chunk_10',
        title: 'User Manual (Section 4)',
        text: 'Charging guidelines: charge in a ventilated room at room temperature between 15°C and 25°C.',
        score: 'Related topic',
      },
      {
        id: 'chunk_14',
        title: 'Warranty Terms',
        text: 'Improper charging cables will void standard battery warranty coverage.',
        score: 'Related topic',
      },
    ],
    rrfResult: [
      { rank: 1, title: 'User Manual (Section 4)', matchType: 'Exact words + Topic match' },
      { rank: 2, title: 'Safety Guide (Page 8)', matchType: 'Exact keyword match' },
    ],
    answer:
      'The battery should only be charged using the certified 5V/2A adapter in a well-ventilated area [1]. Built-in protection prevents overcharging once the battery reaches full capacity [2].',
  },
];

export const PipelineExplainer: React.FC<PipelineExplainerProps> = ({
  onClose,
  isModal = false,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [stageProgress, setStageProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'sandbox'>('pipeline');
  const [selectedSimulationIdx, setSelectedSimulationIdx] = useState<number>(0);
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || activeTab !== 'pipeline') return;

    const intervalMs = 60;
    const durationMs = 6000 / speed;
    const stepIncrement = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setStageProgress((prev) => {
        if (prev >= 100) {
          setActiveStage((current) => (current % 4) + 1);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, activeTab, activeStage]);

  const handleSelectStage = (stageId: number) => {
    setActiveStage(stageId);
    setStageProgress(0);
  };

  const handleNext = () => {
    setActiveStage((prev) => (prev % 4) + 1);
    setStageProgress(0);
  };

  const handlePrev = () => {
    setActiveStage((prev) => (prev === 1 ? 4 : prev - 1));
    setStageProgress(0);
  };

  const handleReset = () => {
    setActiveStage(1);
    setStageProgress(0);
    setIsPlaying(true);
  };

  const currentSimulation = SIMULATED_QUERIES[selectedSimulationIdx];

  const content = (
    <div className="space-y-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How NEXUS Searches Your Documents
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Four-stage pipeline: ingestion, dual indexing, hybrid ranking, and cited generation.
          </p>
        </div>

        {/* Tab Switcher & Modal Close */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step-by-Step Tour
            </button>
            <button
              onClick={() => {
                setActiveTab('sandbox');
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Search Demo
            </button>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-sm ml-2"
              title="Close guide"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Clean Player Control Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Play / Pause & Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-xs"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors font-medium"
                >
                  Next
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Restart from beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-semibold text-slate-800">Step {activeStage} of 4</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{isPlaying ? 'Playing automatically' : 'Paused'}</span>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Speed:</span>
                <button
                  onClick={() => setSpeed(1)}
                  className={`px-2 py-0.5 rounded font-medium ${
                    speed === 1 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  1x
                </button>
                <button
                  onClick={() => setSpeed(1.5)}
                  className={`px-2 py-0.5 rounded font-medium ${
                    speed === 1.5 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  1.5x
                </button>
              </div>
            </div>

            {/* Stage Progress Scrub Track */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {STAGES.map((s) => {
                const isCurrent = activeStage === s.id;
                const isPassed = activeStage > s.id;
                const currentWidth = isCurrent ? stageProgress : isPassed ? 100 : 0;

                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStage(s.id)}
                    className="text-left group cursor-pointer focus:outline-none"
                  >
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          isCurrent ? 'bg-indigo-600' : isPassed ? 'bg-emerald-500' : 'bg-transparent'
                        }`}
                        style={{ width: `${currentWidth}%` }}
                      />
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`text-[11px] block truncate ${
                          isCurrent
                            ? 'text-indigo-600 font-bold'
                            : 'text-slate-600 group-hover:text-slate-900 font-medium'
                        }`}
                      >
                        {s.shortTitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Stage Display Area */}
          <div className="card p-6 border-slate-200 bg-white space-y-6 shadow-xs">
            {/* Stage Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {React.createElement(STAGES[activeStage - 1].icon, {
                    className: 'w-5 h-5',
                  })}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {STAGES[activeStage - 1].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    {STAGES[activeStage - 1].description}
                  </p>
                </div>
              </div>

              {/* Technical Detail Pills */}
              <div className="flex flex-wrap gap-2">
                {STAGES[activeStage - 1].metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="text-slate-500 mr-1">{m.label}:</span>
                    <span className="text-slate-800 font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Interactive Visual Stage Canvas */}
            <div className="min-h-[280px] rounded-xl bg-slate-900 text-slate-100 p-5 relative overflow-hidden border border-slate-800 flex flex-col justify-center">
              {/* STAGE 1: UPLOAD & CHUNKING */}
              {activeStage === 1 && (
                <div className="space-y-6 relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left: Input File */}
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        1. Your Uploaded File
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-indigo-400 shrink-0" />
                        <div className="text-xs truncate">
                          <div className="font-semibold text-slate-100 truncate">
                            Project_Overview.pdf
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            12 Pages • Text &amp; Tables
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-400">
                        <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">or YouTube Video Transcript</span>
                      </div>
                    </div>

                    {/* Middle: Parsing & Section Splitter */}
                    <div className="flex flex-col items-center justify-center px-4 space-y-2 text-center">
                      <div className="text-[11px] text-slate-400">
                        Section Organizer
                      </div>
                      <div className="w-28 h-11 rounded-lg bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-xs font-medium text-indigo-200 gap-1.5 shadow-sm">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Clean Paragraphs</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>Keeps headings intact</span>
                      </div>
                    </div>

                    {/* Right: Output Sections */}
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        2. Organized Sections
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800 border border-indigo-500/40 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300">
                            Section 1 (Page 2)
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            ~150 words
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                          "The project roadmap covers key deliverables, milestones, and budget
                          allocations..."
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                        <span>Section 2 (Page 3)</span>
                        <span className="text-slate-500 text-[11px]">Next paragraph</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: DUAL INDEXING */}
              {activeStage === 2 && (
                <div className="space-y-5 relative z-10">
                  <div className="text-center space-y-1 mb-2">
                    <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                      Parallel Keyword &amp; Meaning Indexing
                    </div>
                    <div className="text-xs text-slate-400">
                      Every section is indexed two ways so no information is ever missed
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Index 1: Exact Words */}
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-indigo-400" />
                          Exact Word Index
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                          Spelling Match
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"deadline"</span>
                          <span className="text-slate-400">Found on Page 2, Page 4</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"warranty"</span>
                          <span className="text-slate-400">Found on Page 8</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"budget"</span>
                          <span className="text-slate-400">Found on Page 2, Page 5</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Finds exact product names, numbers, codes, and specific words with 100% precision.
                      </p>
                    </div>

                    {/* Index 2: Meaning & Concepts */}
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-indigo-400" />
                          Topic &amp; Meaning Index
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                          Context Match
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"when is it due?"</span>
                          <span className="text-indigo-300">Matches "deadline"</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"how much does it cost?"</span>
                          <span className="text-indigo-300">Matches "budget"</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/60">
                          <span>"repair coverage"</span>
                          <span className="text-indigo-300">Matches "warranty"</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Understands questions in everyday English even if your words differ from the document.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: SEARCHING & MATCHING */}
              {activeStage === 3 && (
                <div className="space-y-4 relative z-10">
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-400" />
                      <span className="text-slate-400">User Searches:</span>
                      <span className="font-semibold text-white">
                        "What is the project timeline and deadline?"
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-medium">
                      Scans in 0.05s
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    {/* Left: Word match */}
                    <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-300">
                        Exact Word Hits
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/80 text-slate-300 truncate text-[11px]">
                        ✓ Matches "timeline" (Page 4)
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/80 text-slate-400 truncate text-[11px]">
                        ✓ Matches "deadline" (Page 2)
                      </div>
                    </div>

                    {/* Middle: Combiner */}
                    <div className="p-3 rounded-lg bg-indigo-950 border border-indigo-500/60 text-center space-y-1">
                      <div className="text-xs font-bold text-indigo-200">
                        Smart Ranking
                      </div>
                      <div className="text-[11px] text-indigo-300">
                        Combines words + meaning
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Puts best answers first
                      </div>
                    </div>

                    {/* Right: Meaning match */}
                    <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-300">
                        Meaning &amp; Topic Hits
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/80 text-slate-300 truncate text-[11px]">
                        ✓ Matches "project milestones"
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/80 text-slate-400 truncate text-[11px]">
                        ✓ Matches "schedule of release"
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800 border border-emerald-500/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Top Match:</span>
                      <span className="font-semibold text-white">
                        Project Proposal (Page 2 &amp; 4)
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold text-xs">
                      98% Confidence Match
                    </span>
                  </div>
                </div>
              )}

              {/* STAGE 4: GROUNDED ANSWER & CITATIONS */}
              {activeStage === 4 && (
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-100">
                        Direct Answer with Source Citations
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                      100% Verified from Your Files
                    </span>
                  </div>

                  {/* Generated Answer */}
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <p>
                      The primary project goal is delivering the engine by Q3, with key milestones
                      for data indexing set for June 15{' '}
                      <button
                        onMouseEnter={() => setHoveredCitation(1)}
                        onMouseLeave={() => setHoveredCitation(null)}
                        className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/50 border border-indigo-400 font-bold font-mono text-xs mx-0.5 cursor-pointer"
                      >
                        [1]
                      </button>
                      . User testing and documentation will follow to ensure verifiable accuracy{' '}
                      <button
                        onMouseEnter={() => setHoveredCitation(2)}
                        onMouseLeave={() => setHoveredCitation(null)}
                        className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50 border border-emerald-400 font-bold font-mono text-xs mx-0.5 cursor-pointer"
                      >
                        [2]
                      </button>
                      .
                    </p>
                  </div>

                  {/* Citation preview popover */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-indigo-600 text-white font-mono text-xs flex items-center justify-center font-bold">
                        {hoveredCitation || 1}
                      </span>
                      <span className="text-slate-300">
                        {hoveredCitation === 2
                          ? 'Source: Project Proposal • Page 4 (Testing Timeline)'
                          : 'Source: Project Proposal • Page 2 (Core Deliverables)'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      Hover over citation numbers [1] or [2] above to see the page source
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* LIVE SEARCH DEMO TAB */
        <div className="space-y-6">
          <div className="card p-5 border-slate-200 bg-slate-50 space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Try a Sample Search
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Pick one of the common questions below to see how NEXUS finds matching sections and writes an answer:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {SIMULATED_QUERIES.map((sim, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSimulationIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    selectedSimulationIdx === idx
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  "{sim.query}"
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="card p-6 border-slate-200 bg-white space-y-6 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Question Asked
              </span>
              <h4 className="text-base font-bold text-slate-900">
                "{currentSimulation.query}"
              </h4>
            </div>

            {/* Matching sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                  Exact Word Matches
                </div>
                {currentSimulation.bm25Hits.map((h, i) => (
                  <div key={i} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{h.title}</span>
                      <span className="text-indigo-600 text-[11px]">{h.score}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{h.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Related Topic Matches
                </div>
                {currentSimulation.vectorHits.map((h, i) => (
                  <div key={i} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{h.title}</span>
                      <span className="text-indigo-600 text-[11px]">{h.score}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer */}
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Answer with Clickable Citations</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {currentSimulation.answer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
        <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto border border-slate-200">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
