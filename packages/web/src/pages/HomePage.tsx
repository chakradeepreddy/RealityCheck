import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExperimentForm } from '../components/ExperimentForm';
import { apiClient } from '../api/client';
import type { ExecutionMode } from '../api/types';

const INTEGRATIONS = [
  {
    name: 'Flipkart',
    url: 'flipkart.com',
    capabilities: ['Boundary: Discount %'],
    verdicts: ['SUPPORTED', 'CONTRADICTED'] as const,
    badge: '🛒',
    desc: 'Real listing scrape — reads discount badges from product search results.'
  },
  {
    name: 'Tricentis',
    url: 'demowebshop.tricentis.com',
    capabilities: ['Boundary: Product Price', 'Canary: Network Leak'],
    verdicts: ['SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE'] as const,
    badge: '🛍️',
    desc: 'Demo Web Shop by Tricentis explicitly authorized for test automation.'
  },
  {
    name: 'OWASP Juice Shop',
    url: 'juice-shop.herokuapp.com',
    capabilities: ['Boundary: Product Price', 'Canary: Network Leak'],
    verdicts: ['SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE'] as const,
    badge: '🥤',
    desc: 'Security sandbox explicitly authorized for automated testing by OWASP.'
  },
  {
    name: 'QuickCart',
    url: 'localhost:3000',
    capabilities: ['Boundary: Shipping Threshold', 'Boundary: Quantity Discount'],
    verdicts: ['SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE'] as const,
    badge: '⚡',
    desc: 'Controlled local environment — the reference implementation for all three verdicts.'
  }
];

export function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRunNewExperiment = async (url: string, claim: string, mode: ExecutionMode, attachment?: File) => {
    setIsLoading(true);
    setError(null);

    try {
      let attachmentPath;
      if (attachment) {
        const uploadRes = await apiClient.uploadAttachment(attachment);
        attachmentPath = uploadRes.attachmentPath;
      }

      const run = await apiClient.createRun(claim, url, mode, attachmentPath);
      navigate(`/runs/${run.id}`);
    } catch (err: any) {
      setError(err.data?.error || err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Form */}
      <section>
        <ExperimentForm onSubmit={handleRunNewExperiment} isLoading={isLoading} />
      </section>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-md glass-panel">
          <h3 className="text-red-400 font-bold">Execution Error</h3>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Verified Scenarios */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-sm font-bold text-off-white uppercase tracking-widest text-glow">
            VERIFIED SCENARIOS
          </h2>
          <span className="text-[10px] bg-cyan-accent/10 text-cyan-accent px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-cyan-accent/30">
            Real-world Ready
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {INTEGRATIONS.map((site) => (
            <div key={site.name} className="glass-panel rounded-2xl p-6 border-navy-border hover:border-cyan-accent/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-5">
                <span className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">{site.badge}</span>
                <div>
                  <h3 className="font-bold text-off-white text-lg group-hover:text-cyan-accent transition-colors">{site.name}</h3>
                  <p className="text-xs text-slate-muted font-mono tracking-wide">{site.url}</p>
                </div>
              </div>
              <p className="text-sm text-off-white/80 mb-5 leading-relaxed">{site.desc}</p>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {site.capabilities.map(cap => (
                    <span key={cap} className="text-[11px] bg-navy-bg text-cyan-accent px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-cyan-accent/20">
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {site.verdicts.map(v => (
                    <span key={v} className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      v === 'SUPPORTED' ? 'bg-verdict-supported/10 text-verdict-supported border border-verdict-supported/30' :
                      v === 'CONTRADICTED' ? 'bg-verdict-contradicted/10 text-verdict-contradicted border border-verdict-contradicted/30' :
                      'bg-verdict-inconclusive/10 text-verdict-inconclusive border border-verdict-inconclusive/30'
                    }`}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-muted mt-5 italic text-center max-w-2xl mx-auto">
          All integrations undergo deterministic Playwright/Chromium browser testing before listing. 
          Unverifiable targets are strictly excluded to ensure evidentiary integrity.
        </p>
      </section>
    </div>
  );
}
