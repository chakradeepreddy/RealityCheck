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
  description: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Flipkart — High Discount',
    site: 'Flipkart',
    url: 'https://www.flipkart.com/search?q=laptop',
    claim: 'Every laptop on Flipkart has at least a 90% discount',
    mode: 'AUTHORIZED_LIVE',
    description: 'Test if real listings match an extreme discount claim.'
  },
  {
    label: 'Flipkart — Moderate Discount',
    site: 'Flipkart',
    url: 'https://www.flipkart.com/search?q=laptop',
    claim: 'At least one laptop on Flipkart has a discount percentage above 10%',
    mode: 'AUTHORIZED_LIVE',
    description: 'Test if there are any products with reasonable discounts.'
  },
  {
    label: 'Tricentis — Item Price',
    site: 'Tricentis Demo Shop',
    url: 'https://demowebshop.tricentis.com/',
    claim: 'The cheapest item on the catalog costs at least $25',
    mode: 'AUTHORIZED_LIVE',
    description: 'Reads the item prices and verifies the numeric boundary.'
  },
  {
    label: 'Tricentis — Analytics',
    site: 'Tricentis Demo Shop',
    url: 'https://demowebshop.tricentis.com/',
    claim: 'Does the search bar send data to analytics?',
    mode: 'AUTHORIZED_LIVE',
    description: 'Network monitoring checks for analytics traffic after planting a canary.'
  },
  {
    label: 'QuickCart — Shipping',
    site: 'QuickCart',
    url: 'http://localhost:3000',
    claim: 'Free shipping on orders of 999 or more',
    mode: 'CONTROLLED',
    description: 'Probes the QuickCart cart at multiple subtotals to verify the shipping threshold.'
  },
  {
    label: 'Juice Shop — Third-party Leak',
    site: 'OWASP Juice Shop',
    url: 'https://juice-shop.herokuapp.com/#/',
    claim: 'Does this form send my information to another website?',
    mode: 'AUTHORIZED_LIVE',
    description: 'A canary marker is planted in the search box to monitor for third-party leaks.'
  }
];

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
        <h3 className="text-sm font-bold text-off-white uppercase tracking-widest mb-4 text-glow">
          Quick Presets — Browser-Verified Sites
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              disabled={isLoading}
              className={`text-left p-4 rounded-xl border transition-all disabled:opacity-40 group ${
                activePreset === preset.label
                  ? 'border-cyan-accent bg-cyan-accent/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'glass-panel hover:border-cyan-accent/50 hover:bg-navy-surface/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-cyan-accent font-bold uppercase tracking-widest bg-cyan-accent/20 px-2.5 py-1 rounded-md border border-cyan-accent/30">{preset.site}</span>
              </div>
              <p className="text-sm font-bold text-off-white mb-2 leading-tight group-hover:text-white transition-colors">{preset.claim.substring(0, 60)}{preset.claim.length > 60 ? '…' : ''}</p>
              <p className="text-xs text-slate-muted leading-relaxed">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 md:p-8 rounded-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div>
          <label htmlFor="url" className="block text-sm font-bold tracking-wide text-off-white mb-2">
            Target URL
          </label>
          <input
            id="url"
            type="url"
            className="w-full px-4 py-3 bg-white border border-navy-border rounded-xl focus:ring-2 focus:ring-cyan-accent/50 focus:border-cyan-accent text-[#111318] placeholder-[#6B7280] transition-all outline-none disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setActivePreset(null); }}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="claim" className="block text-sm font-bold tracking-wide text-off-white mb-2">
            Claim
          </label>
          <textarea
            id="claim"
            className="w-full px-4 py-3 bg-white border border-navy-border rounded-xl focus:ring-2 focus:ring-cyan-accent/50 focus:border-cyan-accent text-[#111318] placeholder-[#6B7280] min-h-[100px] transition-all outline-none resize-y disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="e.g. Free shipping on orders over $50"
            value={claim}
            onChange={(e) => { setClaim(e.target.value); setActivePreset(null); }}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="attachment" className="block text-sm font-bold tracking-wide text-off-white mb-2">
            Claim Evidence / Attachment <span className="text-slate-muted font-normal ml-1">(Optional screenshot)</span>
          </label>
          <input
            id="attachment"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="w-full px-4 py-2.5 bg-white border border-navy-border rounded-xl focus:ring-2 focus:ring-cyan-accent/50 focus:border-cyan-accent text-[#111318] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-cyan-accent/20 file:text-cyan-accent hover:file:bg-cyan-accent/30 file:transition-colors file:cursor-pointer outline-none transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-500"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setAttachment(file);
            }}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-bold tracking-wide text-off-white mb-2">
            Execution Mode
          </label>
          <div className="relative">
             <select
              id="mode"
              className="w-full px-4 py-3 bg-white border border-navy-border rounded-xl focus:ring-2 focus:ring-cyan-accent/50 focus:border-cyan-accent text-[#111318] transition-all outline-none appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-500"
              value={mode}
              onChange={(e) => setMode(e.target.value as ExecutionMode)}
              disabled={isLoading}
            >
              <option value="CONTROLLED" className="bg-white text-[#111318]">CONTROLLED (Local / Mock Environment)</option>
              <option value="AUTHORIZED_LIVE" className="bg-white text-[#111318]">AUTHORIZED_LIVE (Real Public Website)</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#6B7280]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl border border-red-500/20 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full relative group overflow-hidden bg-cyan-accent text-navy-bg font-bold tracking-wide py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-accent to-blue-accent group-hover:scale-105 transition-transform duration-300" />
          <span className="relative z-10 text-navy-bg font-extrabold">
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-navy-bg" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Running verification...
              </span>
            ) : 'RUN REALITYCHECK'}
          </span>
        </button>
      </form>
    </div>
  );
};
