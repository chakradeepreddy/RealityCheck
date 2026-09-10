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
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <h3 className="text-red-800 font-medium">Execution Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Verified Integrations */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Verified Integrations
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            Browser-tested before deployment
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATIONS.map((site) => (
            <div key={site.name} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{site.badge}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{site.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{site.url}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-3">{site.desc}</p>
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {site.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {site.verdicts.map(v => (
                    <span key={v} className={`text-xs px-2 py-0.5 rounded font-semibold ${VERDICT_CHIP[v]}`}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 italic">
          All integrations pass real Playwright/Chromium browser tests before being listed here.
          Sites without verifiable browser automation (e.g. Amazon, Myntra) are intentionally excluded.
        </p>
      </section>
    </div>
  );
}
