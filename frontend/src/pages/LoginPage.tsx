import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
              placeholder="Enter your password"
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
      </div>
    </div>
  );
};
