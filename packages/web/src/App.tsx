import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { HistoryPage } from './pages/HistoryPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-white border-b border-slate-200 py-6 px-4 md:px-8 shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img src="/logo.jpg" alt="RealityCheck Logo" className="w-10 h-10 rounded-lg shadow-sm" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">RealityCheck</h1>
                <p className="text-slate-500 text-sm font-medium">Don't just read the claim. Run it.</p>
              </div>
            </Link>
            <nav className="flex gap-6 font-medium text-slate-600">
              <Link to="/" className="hover:text-blue-600 transition-colors">Verify</Link>
              <Link to="/history" className="hover:text-blue-600 transition-colors">Verification History</Link>
              <Link to="/evidence" className="hover:text-blue-600 transition-colors">Evidence Vault</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/runs/:runId" element={<RunDetailsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/evidence" element={<EvidenceVaultPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
