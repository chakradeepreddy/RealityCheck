import React, { useState } from 'react';
import type { ExecutionMode } from '../api/types';

interface ExperimentFormProps {
  onSubmit: (url: string, claim: string, mode: ExecutionMode, attachment?: File) => void;
  isLoading: boolean;
}

interface Preset {
  label: string;
  site: string;
  url: string;
  claim: string;
  mode: ExecutionMode;
  expectedVerdict: 'SUPPORTED' | 'CONTRADICTED' | 'INCONCLUSIVE';
  description: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Flipkart — CONTRADICTED',
    site: 'Flipkart',
    url: 'https://www.flipkart.com/search?q=laptop',
    claim: 'Every laptop on Flipkart has at least a 90% discount',
    mode: 'AUTHORIZED_LIVE',
    expectedVerdict: 'CONTRADICTED',
    description: 'Real listings show 20–60% off. The 90% claim will be contradicted by browser observation.'
  },
  {
    label: 'Flipkart — SUPPORTED',
    site: 'Flipkart',
    url: 'https://www.flipkart.com/search?q=laptop',
    claim: 'At least one laptop on Flipkart has a discount percentage above 10%',
    mode: 'AUTHORIZED_LIVE',
    expectedVerdict: 'SUPPORTED',
    description: 'Browser observes 27+ laptops with discounts. Claim is observably supported.'
  },
  {
    label: 'SauceDemo — CONTRADICTED',
    site: 'SauceDemo',
    url: 'https://www.saucedemo.com',
    claim: 'The cheapest item in the Swag Labs store costs less than $5',
    mode: 'AUTHORIZED_LIVE',
    expectedVerdict: 'CONTRADICTED',
    description: 'Browser logs in with official public credentials and observes the cheapest item is $7.99.'
  },
  {
    label: 'SauceDemo — SUPPORTED',
    site: 'SauceDemo',
    url: 'https://www.saucedemo.com',
    claim: 'The cheapest item in the Swag Labs store costs less than $10',
    mode: 'AUTHORIZED_LIVE',
    expectedVerdict: 'SUPPORTED',
    description: 'Browser observes min price of $7.99 which is below $10. Claim is supported.'
  },
  {
    label: 'QuickCart — SUPPORTED',
    site: 'QuickCart',
    url: 'http://localhost:3000',
    claim: 'Free shipping on orders of 999 or more',
    mode: 'CONTROLLED',
    expectedVerdict: 'SUPPORTED',
    description: 'Browser probes the QuickCart cart at multiple subtotals and observes the shipping threshold.'
  },
  {
    label: 'Juice Shop — SUPPORTED (Canary)',
    site: 'OWASP Juice Shop',
    url: 'https://juice-shop.herokuapp.com/#/',
    claim: 'Does this form send my information to another website?',
    mode: 'AUTHORIZED_LIVE',
    expectedVerdict: 'SUPPORTED',
    description: 'A synthetic canary marker is planted in the search box. Network is monitored for third-party leaks.'
  }
];

const VERDICT_COLORS = {
  SUPPORTED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  CONTRADICTED: 'bg-red-50 border-red-200 text-red-700',
  INCONCLUSIVE: 'bg-amber-50 border-amber-200 text-amber-700'
};

const VERDICT_DOT = {
  SUPPORTED: 'bg-emerald-500',
  CONTRADICTED: 'bg-red-500',
  INCONCLUSIVE: 'bg-amber-500'
};

export const ExperimentForm: React.FC<ExperimentFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [claim, setClaim] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('CONTROLLED');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (preset: Preset) => {
    setUrl(preset.url);
    setClaim(preset.claim);
    setMode(preset.mode);
    setActivePreset(preset.label);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim() || !claim.trim()) {
      setError('Target URL and Claim are required.');
      return;
    }

    if (attachment) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(attachment.type)) {
        setError('Only PNG, JPEG, and WEBP attachments are allowed.');
        return;
      }
      if (attachment.size > 5 * 1024 * 1024) {
        setError('Attachment size must be less than 5MB.');
        return;
      }
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL.');
      return;
    }

    onSubmit(url, claim, mode, attachment || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Presets — Browser-Verified Sites
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              disabled={isLoading}
              className={`text-left p-3 rounded-lg border transition-all hover:shadow-sm disabled:opacity-50 ${
                activePreset === preset.label
                  ? 'border-slate-900 bg-slate-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${VERDICT_COLORS[preset.expectedVerdict]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${VERDICT_DOT[preset.expectedVerdict]}`} />
                  {preset.expectedVerdict}
                </span>
                <span className="text-xs text-slate-400 font-medium">{preset.site}</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">{preset.claim.substring(0, 60)}{preset.claim.length > 60 ? '…' : ''}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-1">
            Target URL
          </label>
          <input
            id="url"
            type="url"
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-accent focus:border-accent"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setActivePreset(null); }}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="claim" className="block text-sm font-medium text-slate-700 mb-1">
            Claim
          </label>
          <textarea
            id="claim"
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-accent focus:border-accent min-h-[90px]"
            placeholder="e.g. Free shipping on orders over $50"
            value={claim}
            onChange={(e) => { setClaim(e.target.value); setActivePreset(null); }}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="attachment" className="block text-sm font-medium text-slate-700 mb-1">
            Claim Evidence / Attachment <span className="text-slate-400 font-normal">(Optional — screenshot of the claim)</span>
          </label>
          <input
            id="attachment"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-accent focus:border-accent text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setAttachment(file);
            }}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-slate-700 mb-1">
            Execution Mode
          </label>
          <select
            id="mode"
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-accent focus:border-accent"
            value={mode}
            onChange={(e) => setMode(e.target.value as ExecutionMode)}
            disabled={isLoading}
          >
            <option value="CONTROLLED">CONTROLLED (Local / Mock Environment)</option>
            <option value="AUTHORIZED_LIVE">AUTHORIZED_LIVE (Real Public Website)</option>
          </select>
        </div>

        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 text-white font-medium py-3 px-4 rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
                  {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Running experiment...
            </span>
          ) : 'Run Check'}
        </button>
      </form>
    </div>
  );
};
