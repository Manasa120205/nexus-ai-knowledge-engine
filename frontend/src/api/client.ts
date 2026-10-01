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
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('nexus_custom_api_url');
    if (custom) return custom.replace(/\/+$/, '');
  }
  return '/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export const setCustomApiUrl = (url: string) => {
  if (!url) {
    localStorage.removeItem('nexus_custom_api_url');
  } else {
    localStorage.setItem('nexus_custom_api_url', url.replace(/\/+$/, ''));
  }
  window.location.reload();
};

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('nexus_access_token');
  }

  public getBaseUrl(): string {
    return API_BASE_URL;
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

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: any) {
      if (
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Load failed')
      ) {
        throw new Error(
          'Unable to reach the NEXUS backend server. The cloud service may be waking up (cold start ~15-25s) or temporarily unreachable. Please retry in a few moments.'
        );
      }
      throw err;
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } else {
          const text = await response.text();
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
            errorMessage = 'Backend service is starting up or temporarily unavailable. Please retry in a moment.';
          }
        }
      } catch {
        // use default status message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const rawText = await response.text();
    if (rawText.startsWith('<!DOCTYPE') || rawText.startsWith('<html')) {
      throw new Error('API server returned HTML instead of JSON. The backend service may be initializing.');
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return {} as T;
    }
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
