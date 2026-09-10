import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { HistoryPage } from './pages/HistoryPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [introFinished, setIntroFinished] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroFinished(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      
      {/* Intro Overlay */}
      {!introFinished && (
        <div className="fixed inset-0 z-[100] bg-[#0b0f19] flex items-center justify-center animate-intro-fade-out pointer-events-none">
          <div className="flex flex-col items-center animate-intro-scale-up">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
              <img src="/logo.jpg" alt="RealityCheck Logo" className="relative w-24 h-24 rounded-2xl shadow-2xl border-2 border-slate-700/50" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white text-glow mb-2">RealityCheck</h1>
            <p className="text-blue-400 font-bold uppercase tracking-widest text-sm">Initializing Evidence Laboratory...</p>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-[#0b0f19] text-slate-200 font-sans relative overflow-hidden ${!introFinished ? 'opacity-0' : 'animate-fade-in-content'}`}>
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none rounded-full blur-3xl opacity-50 mix-blend-screen" />

        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/60 py-4 md:py-5 px-4 md:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-4 group transition-transform hover:scale-[1.02]">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
                <img src="/logo.jpg" alt="RealityCheck Logo" className="relative w-11 h-11 rounded-xl border border-slate-700/50 shadow-lg object-cover" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white text-glow">RealityCheck</h1>
                <p className="text-blue-400/80 text-xs md:text-sm font-semibold tracking-wide uppercase">Don't just read the claim. Run it.</p>
              </div>
            </Link>
            <nav className="flex flex-wrap justify-center gap-3 md:gap-8 font-semibold text-slate-400 text-sm md:text-base">
              <Link to="/" className="hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-blue-500 after:transition-all">Verify</Link>
              <Link to="/history" className="hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-blue-500 after:transition-all">History</Link>
              <Link to="/evidence" className="hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-blue-500 after:transition-all">Evidence Vault</Link>
            </nav>
          </div>
        </header>

        <main className="relative max-w-6xl mx-auto px-4 py-8 md:py-12 page-transition z-10">
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
