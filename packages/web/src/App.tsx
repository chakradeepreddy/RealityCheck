import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { HistoryPage } from './pages/HistoryPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';
import { BootAnimation } from './components/BootAnimation';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [introFinished, setIntroFinished] = useState(false);

  return (
    <BrowserRouter>
      <ScrollToTop />
      
      {/* Intro Overlay */}
      {!introFinished && <BootAnimation onComplete={() => setIntroFinished(true)} />}

      <div className={`min-h-screen bg-[#07111F] text-slate-200 font-sans relative overflow-hidden transition-opacity duration-1000 ${!introFinished ? 'opacity-0' : 'opacity-100'}`}>
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none rounded-full blur-3xl opacity-50 mix-blend-screen" />

        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/60 py-4 md:py-5 px-4 md:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-4 group transition-transform hover:scale-[1.02]">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-accent rounded-xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <img src="/logo.jpg" alt="RealityCheck Logo" className="relative w-11 h-11 rounded-xl border border-navy-border shadow-lg object-contain bg-white p-1" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-off-white text-glow">RealityCheck</h1>
                <p className="text-cyan-accent/80 text-xs md:text-sm font-semibold tracking-wide uppercase">Don't just read the claim. Run it.</p>
              </div>
            </Link>
            <nav className="flex flex-wrap justify-center gap-3 md:gap-8 font-semibold text-slate-400 text-sm md:text-base">
              <Link to="/" className="hover:text-off-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-cyan-accent after:transition-all">Verify</Link>
              <Link to="/history" className="hover:text-off-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-cyan-accent after:transition-all">History</Link>
              <Link to="/evidence" className="hover:text-off-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-cyan-accent after:transition-all">Evidence Vault</Link>
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
