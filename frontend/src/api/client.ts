import {
  AuthToken,
  User,
  DocumentItem,
  DocumentChunk,
  SearchResponse,
  AutocompleteResponse,
  RAGResponse,
  QueryHistoryItem,
  EvaluationResponse,
  EvaluationMetricSummary,
  SystemMetrics,
  HealthStatus,
} from '../types';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api/v1';
  }
  return 'https://fat-dodo-35.loca.lt/api/v1';
};

const API_BASE_URL = getBaseUrl();

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('nexus_access_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Bypass-Tunnel-Reminder': 'true',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // use default status message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async register(data: { email: string; password: string; full_name?: string }): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(formData: FormData): Promise<AuthToken> {
    return this.request<AuthToken>('/auth/login', {
      method: 'POST',
      body: formData,
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // --- Documents Endpoints ---
  async listDocuments(skip = 0, limit = 50): Promise<DocumentItem[]> {
    return this.request<DocumentItem[]>(`/documents/?skip=${skip}&limit=${limit}`);
  }

  async getDocument(id: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${id}`);
  }

  async getDocumentChunks(id: string): Promise<DocumentChunk[]> {
    return this.request<DocumentChunk[]>(`/documents/${id}/chunks`);
  }

  async uploadDocument(file: File, title?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async ingestYouTube(url: string, title?: string): Promise<DocumentItem> {
    return this.request<DocumentItem>('/documents/youtube', {
      method: 'POST',
      body: JSON.stringify({ url, title }),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Search & Autocomplete ---
  async search(params: {
    query: string;
    mode?: string;
    top_k?: number;
    document_id?: string;
  }): Promise<SearchResponse> {
    return this.request<SearchResponse>('/search/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async autocomplete(prefix: string, limit = 8): Promise<AutocompleteResponse> {
    const enc = encodeURIComponent(prefix);
    return this.request<AutocompleteResponse>(`/search/autocomplete?prefix=${enc}&limit=${limit}`);
  }

  // --- RAG Endpoints ---
  async askNexus(params: {
    query: string;
    mode?: string;
    top_k?: number;
    document_id?: string;
  }): Promise<RAGResponse> {
    return this.request<RAGResponse>('/rag/ask', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- Query History ---
  async getHistory(skip = 0, limit = 50): Promise<QueryHistoryItem[]> {
    return this.request<QueryHistoryItem[]>(`/history/?skip=${skip}&limit=${limit}`);
  }

  async deleteHistoryItem(id: string): Promise<void> {
    await this.request<void>(`/history/${id}`, {
      method: 'DELETE',
    });
  }

  async clearAllHistory(): Promise<void> {
    await this.request<void>('/history/', {
      method: 'DELETE',
    });
  }

  // --- Evaluation & Benchmarking ---
  async runEvaluation(params: {
    modes?: string[];
    limit_questions?: number;
  }): Promise<EvaluationResponse> {
    return this.request<EvaluationResponse>('/evaluation/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLatestEvaluationMetrics(limit = 20): Promise<EvaluationMetricSummary[]> {
    return this.request<EvaluationMetricSummary[]>(`/evaluation/runs?limit=${limit}`);
  }

  // --- Telemetry & Health ---
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/metrics/');
  }

  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health');
  }
}

export const api = new ApiClient();
