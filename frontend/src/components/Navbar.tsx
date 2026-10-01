import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  HelpCircle,
  History,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { UserTourModal } from './UserTourModal';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [devDropdownOpen, setDevDropdownOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const devDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (devDropdownRef.current && !devDropdownRef.current.contains(event.target as Node)) {
        setDevDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Knowledge', path: '/documents', icon: FolderOpen },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Ask', path: '/ask', icon: HelpCircle },
    { name: 'History', path: '/history', icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-8">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              N
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              NEXUS
            </span>
          </Link>

          {/* Desktop Main Nav */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section / Auth, Help & Developer Dropdown */}
        <div className="hidden md:flex items-center gap-3">
          {/* Help Button - User Guide & Interactive Tour */}
          <button
            type="button"
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="How NEXUS Works (User Guide)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Help</span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Developer / Benchmarks Menu (Subtle) */}
              <div className="relative" ref={devDropdownRef}>
                <button
                  type="button"
                  onClick={() => setDevDropdownOpen(!devDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Developer & System Benchmarks"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Developer</span>
                </button>

                {devDropdownOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50 text-xs"
                    onClick={() => setDevDropdownOpen(false)}
                  >
                    <Link
                      to="/evaluation"
                      className="block px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      Evaluation & Benchmarks
                    </Link>
                    <Link
                      to="/system"
                      className="block px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      System & Health Status
                    </Link>
                  </div>
                )}
              </div>

              {/* User Profile & Sign Out */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <span className="text-xs font-medium text-slate-700 max-w-[160px] truncate" title={user?.email}>
                  {user?.full_name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-outline !py-1 !px-2.5 !text-xs text-slate-600 hover:text-rose-600 hover:border-rose-300"
                  title="Sign out of your account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="btn-outline !py-1.5 !px-3"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary !py-1.5 !px-3.5"
              >
                <UserPlus className="w-4 h-4" />
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {isAuthenticated ? (
            <>
              <div className="py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
                Signed in as: <span className="text-slate-900 font-semibold">{user?.email}</span>
              </div>
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-slate-100 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <Link
                  to="/evaluation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Evaluation Benchmarks
                </Link>
                <Link
                  to="/system"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  System & Health
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full btn-outline justify-center"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full btn-primary justify-center"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Help Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setHelpModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>How NEXUS Works (User Guide)</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Interactive User Tour Modal */}
      <UserTourModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </header>
  );
};
