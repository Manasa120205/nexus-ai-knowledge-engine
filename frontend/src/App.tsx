import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SearchPage } from './pages/SearchPage';
import { AskNexusPage } from './pages/AskNexusPage';
import { QueryHistoryPage } from './pages/QueryHistoryPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SystemPage } from './pages/SystemPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<KnowledgeBasePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ask" element={<AskNexusPage />} />
            <Route path="/history" element={<QueryHistoryPage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default App;
