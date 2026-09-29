import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  FileText,
  Database,
  GitMerge,
  Cpu,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  BookOpen,
  Layers,
  ChevronRight,
  Sliders,
  ExternalLink,
  Code,
  Tag,
} from 'lucide-react';

interface PipelineExplainerProps {
  onClose?: () => void;
  isModal?: boolean;
}

const STAGES = [
  {
    id: 1,
    title: '1. Ingestion & Structure Chunking',
    shortTitle: 'Ingestion & Chunking',
    icon: FileText,
    accent: 'indigo',
    description:
      'Raw technical files (PDFs, Markdown, YouTube transcripts, notes) are parsed while preserving headings, lists, tables, and sentence boundaries.',
    metrics: [
      { label: 'Token Window', value: '512 tokens' },
      { label: 'Sliding Overlap', value: '64 tokens' },
      { label: 'Structure Preservation', value: 'Headings & Tables' },
    ],
  },
  {
    id: 2,
    title: '2. Dual-Engine Indexing',
    shortTitle: 'Dual Indexing',
    icon: Database,
    accent: 'purple',
    description:
      'Chunks are simultaneously indexed across two complementary engines: a BM25 Inverted Index for exact technical terms and a 384-d Dense Vector Space for conceptual meaning.',
    metrics: [
      { label: 'Lexical Index', value: 'BM25 (k1=1.5, b=0.75)' },
      { label: 'Dense Embeddings', value: '384-dimensional vectors' },
      { label: 'Prefix Trie', value: 'O(k) Autocomplete' },
    ],
  },
  {
    id: 3,
    title: '3. Hybrid Retrieval & RRF Fusion',
    shortTitle: 'Hybrid RRF Retrieval',
    icon: GitMerge,
    accent: 'blue',
    description:
      'When you ask a question, NEXUS queries BM25 and Vector Search in parallel, then fuses their ranks using Reciprocal Rank Fusion (RRF) to eliminate semantic drift.',
    metrics: [
      { label: 'RRF Constant (k)', value: 'k = 60' },
      { label: 'Execution', value: 'Parallel Multi-Threaded' },
      { label: 'Coverage', value: 'Exact + Semantic' },
    ],
  },
  {
    id: 4,
    title: '4. Grounded Synthesis & Citations',
    shortTitle: 'Grounded Citations',
    icon: Cpu,
    accent: 'emerald',
    description:
      'Top-ranked passages are injected into the synthesis engine. Sentences are strictly grounded with verifiable [1], [2] citations. Unsupported claims are rejected.',
    metrics: [
      { label: 'Grounding Rule', value: '100% Evidence Grounded' },
      { label: 'Citation Type', value: 'Sentence-Level [1], [2]' },
      { label: 'Hallucination Check', value: 'Active Claim Verification' },
    ],
  },
];

const SIMULATED_QUERIES = [
  {
    query: 'How does self-attention compute query, key, and value vectors?',
    bm25Hits: [
      { id: 'chunk_1', title: 'Attention Is All You Need (Sec 3.2)', text: 'The self-attention mechanism projects input embeddings into Query (Q), Key (K), and Value (V) matrices using learned linear projections.', score: 0.94 },
      { id: 'chunk_4', title: 'Attention Is All You Need (Sec 3.1)', text: 'Scaled Dot-Product Attention computes softmax(QK^T / sqrt(d_k))V.', score: 0.88 },
    ],
    vectorHits: [
      { id: 'chunk_1', title: 'Attention Is All You Need (Sec 3.2)', text: 'Linear weight matrices W_Q, W_K, W_V multiply the representations to yield attention head components.', score: 0.91 },
      { id: 'chunk_7', title: 'Transformer Lecture Notes', text: 'Attention calculates similarity scores across token pairs before aggregating feature values.', score: 0.85 },
    ],
    rrfResult: [
      { rank: 1, id: 'chunk_1', title: 'Attention Is All You Need (Sec 3.2)', rrfScore: 0.0328, source: 'BM25 (#1) + Vector (#1)' },
      { rank: 2, id: 'chunk_4', title: 'Attention Is All You Need (Sec 3.1)', rrfScore: 0.0161, source: 'BM25 (#2)' },
      { rank: 3, id: 'chunk_7', title: 'Transformer Lecture Notes', rrfScore: 0.0159, source: 'Vector (#2)' },
    ],
    answer:
      'Self-attention computes Query (Q), Key (K), and Value (V) representations by projecting the input embeddings through learned linear weight matrices [1]. The attention weights are then derived using Scaled Dot-Product Attention as softmax(QKᵀ / √d_k) [2].',
  },
  {
    query: 'Explain BM25 inverted index term frequency saturation',
    bm25Hits: [
      { id: 'chunk_12', title: 'Information Retrieval Principles', text: 'BM25 limits the impact of repeatedly occurring words using parameter k1, which saturates term frequency growth asymptotically.', score: 0.96 },
      { id: 'chunk_15', title: 'NEXUS Search Engine Guide', text: 'The parameter b balances document length normalization against average corpus length.', score: 0.82 },
    ],
    vectorHits: [
      { id: 'chunk_12', title: 'Information Retrieval Principles', text: 'Sub-linear term frequency ensures excessive repetition does not disproportionately skew document ranking.', score: 0.89 },
      { id: 'chunk_18', title: 'Sparse vs Dense Benchmarks', text: 'Sparse lexical search excels at rare technical terminology and exact acronyms.', score: 0.79 },
    ],
    rrfResult: [
      { rank: 1, id: 'chunk_12', title: 'Information Retrieval Principles', rrfScore: 0.0328, source: 'BM25 (#1) + Vector (#1)' },
      { rank: 2, id: 'chunk_15', title: 'NEXUS Search Engine Guide', rrfScore: 0.0161, source: 'BM25 (#2)' },
    ],
    answer:
      'BM25 achieves term frequency saturation through the k₁ tuning parameter [1]. Unlike raw term frequency, BM25 ensures that additional occurrences of a term provide diminishing marginal score returns [1]. Document length normalization parameter b prevents long documents from unfairly dominating [2].',
  },
];

export const PipelineExplainer: React.FC<PipelineExplainerProps> = ({
  onClose,
  isModal = false,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1); // 1 = 6s, 1.5 = 4s
  const [stageProgress, setStageProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'sandbox'>('pipeline');
  const [selectedSimulationIdx, setSelectedSimulationIdx] = useState<number>(0);
  const [customSimQuery, setCustomSimQuery] = useState<string>('');
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || activeTab !== 'pipeline') return;

    const intervalMs = 60; // 60ms tick
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

  // When manually selecting a stage, reset progress
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Architecture &amp; Retrieval Tour</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            How the NEXUS Pipeline Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            From raw technical documents to verified, zero-hallucination citations.
          </p>
        </div>

        {/* Tab Switcher & Modal Close */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Animated Tour
            </button>
            <button
              onClick={() => {
                setActiveTab('sandbox');
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive Simulator
            </button>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-sm ml-2"
              title="Close explainer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Video-Style Player Control Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Play / Pause & Prev / Next */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
                  title={isPlaying ? 'Pause auto-play' : 'Play auto-play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handlePrev}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Previous stage"
                >
                  Prev
                </button>
                <button
                  onClick={handleNext}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Next stage"
                >
                  Next
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Reset to beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status and Timecode */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span>STAGE {activeStage} OF 4</span>
                <span className="text-slate-500">•</span>
                <span className="text-indigo-300">
                  {isPlaying ? 'PLAYING' : 'PAUSED'}
                </span>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Speed:</span>
                <button
                  onClick={() => setSpeed(1)}
                  className={`px-2 py-0.5 rounded font-mono ${
                    speed === 1 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  1x
                </button>
                <button
                  onClick={() => setSpeed(1.5)}
                  className={`px-2 py-0.5 rounded font-mono ${
                    speed === 1.5 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          isCurrent
                            ? 'bg-indigo-400'
                            : isPassed
                            ? 'bg-emerald-400'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${currentWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`text-[10px] font-medium truncate ${
                          isCurrent
                            ? 'text-indigo-300 font-bold'
                            : 'text-slate-400 group-hover:text-slate-200'
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
          <div className="card p-6 border-slate-200 bg-white relative overflow-hidden shadow-sm">
            {/* Stage Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                    activeStage === 1
                      ? 'bg-indigo-600'
                      : activeStage === 2
                      ? 'bg-purple-600'
                      : activeStage === 3
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {React.createElement(STAGES[activeStage - 1].icon, {
                    className: 'w-5 h-5',
                  })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {STAGES[activeStage - 1].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                    {STAGES[activeStage - 1].description}
                  </p>
                </div>
              </div>

              {/* Key Technical Metric Pills */}
              <div className="flex flex-wrap gap-2">
                {STAGES[activeStage - 1].metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="text-slate-500 font-normal mr-1">{m.label}:</span>
                    <span className="text-slate-900 font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Visual Animations */}
            <div className="min-h-[290px] rounded-xl bg-slate-900 text-white p-5 relative overflow-hidden border border-slate-800 flex flex-col justify-center">
              {/* Background Tech Grid */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* STAGE 1: INGESTION & CHUNKING ANIMATION */}
              {activeStage === 1 && (
                <div className="space-y-6 relative z-10 animate-fadeIn">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left: Input Documents */}
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider mb-2">
                        1. Raw Technical Input
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/80 border border-indigo-500/30 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-indigo-400 shrink-0" />
                        <div className="text-xs truncate">
                          <div className="font-semibold text-slate-100 truncate">
                            Technical_Spec_v2.pdf
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            12 Pages • 4,820 Words
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center gap-3 text-xs text-slate-400">
                        <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate">architecture_overview.md</span>
                      </div>
                    </div>

                    {/* Middle: Parsing & Boundary Analyzer (Animated) */}
                    <div className="flex flex-col items-center justify-center px-4 space-y-2">
                      <div className="text-[10px] font-mono text-slate-400 text-center">
                        Structure-Aware Chunking Engine
                      </div>
                      <div className="w-24 h-12 rounded-lg bg-indigo-950/80 border border-indigo-400 flex items-center justify-center relative shadow-lg shadow-indigo-500/20">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-lg animate-pulse" />
                        <div className="flex items-center gap-1 font-mono text-xs text-indigo-200">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          <span>512 / 64</span>
                        </div>
                      </div>
                      <svg className="w-20 h-4 text-indigo-400" viewBox="0 0 100 20">
                        <line
                          x1="0"
                          y1="10"
                          x2="100"
                          y2="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="animate-flow-dash"
                        />
                      </svg>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        ✓ Preserving Headers &amp; Code
                      </div>
                    </div>

                    {/* Right: Extracted Chunks Output */}
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider mb-2">
                        Clean Semantic Chunks
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300 font-mono">
                            Chunk #12 (Page 3)
                          </span>
                          <span className="text-emerald-400 text-[10px] font-bold">
                            384 tokens
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2 italic">
                          "## Scaled Dot-Product Attention: The queries and keys are of
                          dimension d_k, and values of dimension d_v..."
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-center justify-between">
                        <span>Chunk #13 (Page 3 - Overlap)</span>
                        <span className="text-slate-500 text-[11px]">64 tok overlap</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: DUAL INDEXING ANIMATION */}
              {activeStage === 2 && (
                <div className="space-y-6 relative z-10 animate-fadeIn">
                  <div className="text-center space-y-1 mb-2">
                    <div className="text-xs font-mono text-purple-300 uppercase tracking-wider">
                      Parallel Inverted Lexical &amp; Dense Vector Indexing
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Every chunk is represented simultaneously in two complementary representations
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* Branch A: BM25 Inverted Index */}
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-purple-500/40 space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-purple-200">
                            BM25 Inverted Index (Sparse)
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                          Exact Match
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/70 border border-slate-700/50">
                          <span className="text-purple-300">"transformer"</span>
                          <span className="text-slate-400">Doc 1: TF=4, Doc 2: TF=2</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/70 border border-slate-700/50">
                          <span className="text-purple-300">"attention"</span>
                          <span className="text-slate-400">Doc 1: TF=7, Doc 3: TF=1</span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-slate-900/70 border border-slate-700/50">
                          <span className="text-purple-300">"softmax"</span>
                          <span className="text-slate-400">Doc 1: TF=3, Doc 4: TF=5</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Guarantees zero false negatives when searching exact function names,
                        acronyms, or rare technical terms.
                      </p>
                    </div>

                    {/* Branch B: Dense Vector Space */}
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/40 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-200">
                            Dense Vector Space (Semantic)
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                          384 Dimensions
                        </span>
                      </div>
                      {/* Floating Vector Coordinate Canvas */}
                      <div className="h-24 rounded bg-slate-900/80 border border-slate-700/50 relative flex items-center justify-center p-2 overflow-hidden">
                        <div className="absolute top-2 left-4 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                          <span className="text-[10px] text-indigo-300 font-mono">
                            Chunk [0.42, -0.19, 0.81...]
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-6 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="text-[10px] text-purple-300 font-mono">
                            Semantic Cluster #3
                          </span>
                        </div>
                        <svg className="w-full h-full opacity-30">
                          <line x1="20" y1="20" x2="80" y2="70" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="120" y1="30" x2="220" y2="60" stroke="#c084fc" strokeWidth="1" strokeDasharray="3 3" />
                        </svg>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Understands paraphrased questions and synonym queries even if the user
                        doesn't use the author's exact words.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: HYBRID RETRIEVAL & RRF ANIMATION */}
              {activeStage === 3 && (
                <div className="space-y-4 relative z-10 animate-fadeIn">
                  <div className="p-2.5 rounded-lg bg-slate-800/90 border border-blue-500/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 font-mono">Query:</span>
                      <span className="font-semibold text-white">
                        "How do transformers compute self-attention?"
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
                      Parallel Multi-Search
                    </span>
                  </div>

                  {/* Dual Search Stream Merging into RRF */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    {/* Left: BM25 Ranked Stream */}
                    <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[11px] space-y-1.5">
                      <div className="font-bold text-purple-300 flex justify-between">
                        <span>BM25 Top Ranked</span>
                        <span className="font-mono">k1=1.5</span>
                      </div>
                      <div className="p-1 rounded bg-slate-900/80 text-slate-300 truncate">
                        #1: Attention Is All You Need (Sec 3.2)
                      </div>
                      <div className="p-1 rounded bg-slate-900/50 text-slate-400 truncate">
                        #2: Transformer Implementation Notes
                      </div>
                    </div>

                    {/* Middle: Reciprocal Rank Fusion Core */}
                    <div className="p-3 rounded-lg bg-blue-950/70 border border-blue-400 text-center space-y-1.5 shadow-lg shadow-blue-500/20">
                      <div className="text-[11px] font-bold text-blue-200">
                        RRF Fusion Engine
                      </div>
                      <div className="font-mono text-[10px] text-blue-300 bg-slate-900/90 py-1 px-2 rounded border border-blue-500/40">
                        RRF(d) = Σ 1 / (60 + r_i)
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Overcomes Semantic Drift
                      </div>
                    </div>

                    {/* Right: Dense Vector Ranked Stream */}
                    <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] space-y-1.5">
                      <div className="font-bold text-indigo-300 flex justify-between">
                        <span>Vector Cosine Top</span>
                        <span className="font-mono">Cosine Sim</span>
                      </div>
                      <div className="p-1 rounded bg-slate-900/80 text-slate-300 truncate">
                        #1: Attention Is All You Need (Sec 3.2)
                      </div>
                      <div className="p-1 rounded bg-slate-900/50 text-slate-400 truncate">
                        #2: Deep Learning Neural Primer
                      </div>
                    </div>
                  </div>

                  {/* Final Merged Ranking */}
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-emerald-500/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300">Winner Chunk #1:</span>
                      <span className="font-bold text-white">
                        Attention Is All You Need (Sec 3.2)
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold text-[11px]">
                      RRF Score: 0.0328
                    </span>
                  </div>
                </div>
              )}

              {/* STAGE 4: GROUNDED SYNTHESIS ANIMATION */}
              {activeStage === 4 && (
                <div className="space-y-4 relative z-10 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-emerald-300">
                        Zero-Hallucination Grounded Answer
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        100% Verified Citations
                      </span>
                    </div>
                  </div>

                  {/* Generated Answer with interactive highlighted citations */}
                  <div className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                    <p>
                      Self-attention calculates representations by projecting inputs into Query (Q),
                      Key (K), and Value (V) matrices through learned weight matrices{' '}
                      <button
                        onMouseEnter={() => setHoveredCitation(1)}
                        onMouseLeave={() => setHoveredCitation(null)}
                        className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/50 border border-indigo-400 font-bold font-mono text-xs mx-0.5 cursor-pointer"
                      >
                        [1]
                      </button>
                      . The attention distribution is subsequently determined using Scaled
                      Dot-Product Attention as softmax(QKᵀ / √d_k)V{' '}
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

                  {/* Citation Evidence Card Popover */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-indigo-600 text-white font-mono text-xs flex items-center justify-center font-bold">
                        {hoveredCitation || 1}
                      </span>
                      <span className="text-slate-300">
                        {hoveredCitation === 2
                          ? 'Source: Attention Is All You Need (Sec 3.1) • Page 4'
                          : 'Source: Attention Is All You Need (Sec 3.2) • Page 5'}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] italic">
                      Hover citation above to inspect source grounding
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* INTERACTIVE SIMULATOR / SANDBOX TAB */
        <div className="space-y-6">
          <div className="card p-5 border-indigo-100 bg-indigo-50/40 space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Test Real-Time Pipeline Simulator
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Select one of the sample queries below to see how NEXUS executes parallel keyword &amp;
              dense search, computes reciprocal ranks, and extracts grounded passages.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {SIMULATED_QUERIES.map((sim, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSimulationIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    selectedSimulationIdx === idx
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  "{sim.query.slice(0, 45)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="card p-6 border-slate-200 bg-white space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono text-indigo-600 uppercase font-semibold">
                Simulated Query
              </span>
              <h4 className="text-base font-bold text-slate-900">
                "{currentSimulation.query}"
              </h4>
            </div>

            {/* Parallel Search Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-purple-600" />
                    BM25 Sparse Matches
                  </span>
                  <span className="text-purple-600 font-mono">IDF Weighted</span>
                </div>
                {currentSimulation.bm25Hits.map((h, i) => (
                  <div key={i} className="p-2 rounded bg-white border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{h.title}</span>
                      <span className="text-purple-700 font-mono">Score: {h.score}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{h.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    Dense Vector Matches
                  </span>
                  <span className="text-indigo-600 font-mono">Cosine Sim</span>
                </div>
                {currentSimulation.vectorHits.map((h, i) => (
                  <div key={i} className="p-2 rounded bg-white border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{h.title}</span>
                      <span className="text-indigo-700 font-mono">Score: {h.score}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reciprocal Rank Fusion Output */}
            <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-indigo-600" />
                  RRF Reciprocal Rank Merged Output
                </span>
                <span className="text-[11px] font-mono text-indigo-700">k = 60</span>
              </div>
              <div className="space-y-2">
                {currentSimulation.rrfResult.map((res, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-md bg-white border border-indigo-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                        #{res.rank}
                      </span>
                      <span className="font-semibold text-slate-800">{res.title}</span>
                      <span className="text-[10px] text-slate-500">({res.source})</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-700">
                      Score: {res.rrfScore.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesized Answer */}
            <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Grounded Synthesized Answer</span>
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
