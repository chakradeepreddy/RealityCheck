import React, { useState } from 'react';
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

const VERDICT_CHIP: Record<string, string> = {
  SUPPORTED: 'bg-emerald-100 text-emerald-700',
  CONTRADICTED: 'bg-red-100 text-red-700',
  INCONCLUSIVE: 'bg-amber-100 text-amber-700'
};

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

      {/* Verified Integrations */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest text-glow">
            Verified Integrations
          </h2>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
            Browser-tested
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATIONS.map((site) => (
            <div key={site.name} className="glass-panel rounded-xl p-5 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl drop-shadow-md">{site.badge}</span>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg">{site.name}</h3>
                  <p className="text-xs text-blue-400 font-mono tracking-wide">{site.url}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">{site.desc}</p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {site.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-md font-medium border border-slate-700/50">
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {site.verdicts.map(v => (
                    <span key={v} className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      v === 'SUPPORTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      v === 'CONTRADICTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4 italic">
          All integrations pass real Playwright/Chromium browser tests before being listed here.
          Sites without verifiable browser automation are intentionally excluded.
        </p>
      </section>
    </div>
  );
}
