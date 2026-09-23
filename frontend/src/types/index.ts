export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  source_type: 'pdf' | 'youtube' | 'text' | 'markdown';
  source_url?: string;
  content_hash: string;
  file_size: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  chunk_count: number;
  doc_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  page_number?: number;
  section?: string;
  timestamp_seconds?: number;
  source_type: string;
  token_count: number;
  created_at: string;
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  document_title: string;
  text: string;
  snippet: string;
  score: number;
  semantic_score?: number;
  keyword_score?: number;
  title_score?: number;
  freshness_score?: number;
  page_number?: number;
  timestamp_seconds?: number;
  section?: string;
  source_type: string;
}

export interface SearchResponse {
  query: string;
  mode: string;
  total_results: number;
  latency_ms: number;
  results: SearchResultItem[];
}

export interface AutocompleteSuggestion {
  word: string;
  frequency: number;
  score: number;
}

export interface AutocompleteResponse {
  prefix: string;
  suggestions: AutocompleteSuggestion[];
  latency_ms: number;
}

export interface Citation {
  citation_index: number;
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number?: number;
  timestamp_seconds?: number;
  section?: string;
  snippet: string;
  source_type: string;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: Citation[];
  latency_ms: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  cache_hit: boolean;
  mode: string;
  model_used: string;
  sufficient_evidence: boolean;
  metadata?: Record<string, any>;
}

export interface QueryHistoryItem {
  id: string;
  query_text: string;
  mode: string;
  response_text?: string;
  cache_hit: boolean;
  latency_ms: number;
  citations_count: number;
  created_at: string;
}

export interface EvaluationMetricSummary {
  mode: string;
  recall_at_k: number;
  precision_at_k: number;
  mrr: number;
  ndcg: number;
  groundedness_score: number;
  citation_accuracy: number;
  retrieval_latency_ms: number;
  total_latency_ms: number;
  total_questions: number;
}

export interface EvaluationResponse {
  run_id: string;
  created_at: string;
  summaries: EvaluationMetricSummary[];
}

export interface SystemMetrics {
  total_documents: number;
  total_chunks: number;
  total_queries: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  avg_latency_ms: number;
  active_jobs: number;
  providers: {
    embedding: string;
    llm: string;
    cache: string;
    database: string;
  };
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  database: string;
  cache: string;
  embedding_provider: string;
  llm_provider: string;
  uptime_seconds: number;
}
