import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { DocumentItem, DocumentChunk } from '../types';
import {
  Upload,
  Video,
  FileText,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  X,
  RefreshCw,
  Plus,
  Layers,
  HelpCircle,
  Lock,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PipelineExplainer } from '../components/PipelineExplainer';

export const KnowledgeBasePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'upload' | 'youtube' | null>(null);
  const [selectedDocChunks, setSelectedDocChunks] = useState<{ doc: DocumentItem; chunks: DocumentChunk[] } | null>(null);
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  const [showExplainerInline, setShowExplainerInline] = useState(false);

  // Form states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [youtubeUrl, setYouTubeUrl] = useState('');
  const [youtubeTitle, setYouTubeTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch documents (only when authenticated)
  const { data: documents = [], isLoading, error: docsError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 10000 : false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('Please select a file to upload.');
      return api.uploadDocument(uploadFile, uploadTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      setActiveModal(null);
      setUploadFile(null);
      setUploadTitle('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'We could not process this file. Please check the file and try again.');
    },
  });

  // YouTube mutation
  const youtubeMutation = useMutation({
    mutationFn: async () => {
      if (!youtubeUrl.trim()) throw new Error('Please enter a valid YouTube URL.');
      return api.ingestYouTube(youtubeUrl, youtubeTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      setActiveModal(null);
      setYouTubeUrl('');
      setYouTubeTitle('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'We could not extract captions from this video. Please check the URL.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
    },
  });

  // View chunks handler
  const handleViewChunks = async (doc: DocumentItem) => {
    try {
      const chunks = await api.getDocumentChunks(doc.id);
      setSelectedDocChunks({ doc, chunks });
    } catch {
      alert('Could not load document sections. Please try again.');
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.source_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Sign in to access your Knowledge Base
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Your uploaded documents and search indexes are private to your account. Sign in to upload PDFs, search, and manage your technical files.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/login" className="btn-primary !px-6 !py-2.5">
            Sign In
          </Link>
          <Link to="/register" className="btn-outline !px-6 !py-2.5">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Documents</h1>
          <p className="text-sm text-slate-600">
            Upload your PDFs, notes, or YouTube transcripts. Search for any word or ask questions to get exact answers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExplainerInline(!showExplainerInline)}
            className="btn-outline !text-xs text-slate-700 hover:text-indigo-600 border-slate-300"
            title="Toggle search walkthrough"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showExplainerInline ? 'Hide Guide' : 'How Search Works'}</span>
          </button>
          <button
            onClick={() => { setActiveModal('upload'); setFormError(null); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={() => { setActiveModal('youtube'); setFormError(null); }}
            className="btn-outline"
          >
            <Video className="w-4 h-4 text-slate-600" />
            Add YouTube
          </button>
        </div>
      </div>

      {/* Prominent Walkthrough Card matching page theme */}
      {showExplainerInline && (
        <div className="card p-5 sm:p-6 bg-white shadow-xs border border-slate-200/90 rounded-xl space-y-4">
          <PipelineExplainer />
        </div>
      )}

      {/* Global Error Banner */}
      {docsError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Something went wrong while loading your knowledge base. Please try again.</span>
          </div>
          <button onClick={() => refetch()} className="btn-outline !py-1 !px-2.5 !text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search documents by title, keyword, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3.25rem' }}
            className="w-full pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
        </div>
      </div>

      {/* Document Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            Loading documents...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No documents uploaded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchTerm
                ? 'No documents matched your search term.'
                : 'Upload your first PDF file or paste a YouTube transcript to start searching keywords and asking questions.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setActiveModal('upload')}
                className="btn-primary !text-xs !py-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Sections</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const isProcessing = doc.status === 'processing';
                  const isFailed = doc.status === 'failed';
                  const isReady = doc.status === 'completed';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate" title={doc.title}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase text-[11px] font-semibold text-slate-600">
                          {doc.source_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {doc.chunk_count || 1} sections
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {isReady && (
                          <span className="badge badge-success">
                            <CheckCircle className="w-3 h-3" />
                            Ready
                          </span>
                        )}
                        {isProcessing && (
                          <span className="badge badge-info">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Processing
                          </span>
                        )}
                        {isFailed && (
                          <span className="badge badge-warning" title="We couldn't process this document. Please check the file and try again.">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewChunks(doc)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                            title="View extracted sections"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Upload Technical Document</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., PostgreSQL Storage Engine Architecture"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Select File (PDF, Markdown, or Text &mdash; max 25MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt,.md,.markdown"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-outline !text-xs !py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || !uploadFile}
                  className="btn-primary !text-xs !py-1.5"
                >
                  {uploadMutation.isPending ? 'Processing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add YouTube Modal */}
      {activeModal === 'youtube' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Add YouTube Video Transcript</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                youtubeMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Video Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Distributed Consensus Lecture"
                  value={youtubeTitle}
                  onChange={(e) => setYouTubeTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYouTubeUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-outline !text-xs !py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={youtubeMutation.isPending || !youtubeUrl.trim()}
                  className="btn-primary !text-xs !py-1.5"
                >
                  {youtubeMutation.isPending ? 'Extracting...' : 'Index Transcript'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Extracted Chunks Modal */}
      {selectedDocChunks && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {selectedDocChunks.doc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDocChunks.chunks.length} extracted sections
                </p>
              </div>
              <button
                onClick={() => setSelectedDocChunks(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {selectedDocChunks.chunks.map((c, i) => (
                <div key={c.id || i} className="p-3 rounded border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                    <span>Section #{c.chunk_index + 1} {c.section ? `— ${c.section}` : ''}</span>
                    <span>
                      {c.page_number ? `Page ${c.page_number}` : ''}
                      {c.timestamp_seconds ? `Time: ${c.timestamp_seconds}s` : ''}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed font-sans">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animated Pipeline Explainer Modal */}
      {showExplainerModal && (
        <PipelineExplainer isModal onClose={() => setShowExplainerModal(false)} />
      )}
    </div>
  );
};
