import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, RefreshCw } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. An account with this email may already exist.');
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
          <h1 className="text-xl font-bold text-slate-900 pt-2">Create your NEXUS account</h1>
          <p className="text-xs text-slate-500">
            Start organizing and questioning your technical documents today.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-rose-800 mb-0.5">Registration Notice</span>
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Full Name (Optional)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Margaret Hamilton"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="form-input"
            />
            <p className="text-[11px] text-slate-400 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
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
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
