import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, RefreshCw, Server, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE_URL, setCustomApiUrl } from '../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full space-y-6 shadow-md border-slate-200">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
            N
          </div>
          <h1 className="text-xl font-bold text-slate-900 pt-2">Sign in to NEXUS</h1>
          <p className="text-xs text-slate-500">
            Access your isolated technical knowledge base and documents.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-rose-800 mb-0.5">Connection Notice</span>
                <span>{error}</span>
              </div>
            </div>
            {error.includes('Unable to reach') && (
              <div className="pt-2 flex items-center justify-between border-t border-rose-200/60">
                <span className="text-[11px] text-rose-600">Free cloud tier may require ~20s cold start.</span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Retry Now
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="form-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-medium">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary !py-2.5 mt-2 justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Register here
            </Link>
          </div>
        </div>

        {/* Connection Diagnostics and Fallback Settings */}
        <div className="pt-2 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowServerSettings(!showServerSettings)}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
          >
            <Server className="w-3 h-3 text-slate-400" />
            Backend API: <span className="font-mono text-slate-600">{API_BASE_URL}</span>
            {showServerSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showServerSettings && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left space-y-2 text-xs">
              <label className="block text-[11px] font-medium text-slate-700">
                Custom Backend API URL (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://nexus-ai-engine.onrender.com/api/v1"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="form-input text-xs py-1 flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCustomApiUrl(customUrlInput)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                >
                  Save
                </button>
                {localStorage.getItem('nexus_custom_api_url') && (
                  <button
                    type="button"
                    onClick={() => setCustomApiUrl('')}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                By default, requests use relative <code>/api/v1</code>. If you deployed your backend to Render or another cloud host, you can enter its URL here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
