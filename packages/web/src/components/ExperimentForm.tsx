import React, { useState } from 'react';
import type { ExecutionMode } from '../api/types';

interface ExperimentFormProps {
  onSubmit: (url: string, claim: string, mode: ExecutionMode, attachment?: File) => void;
  isLoading: boolean;
}

export const ExperimentForm: React.FC<ExperimentFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [claim, setClaim] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('CONTROLLED');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="space-y-4">
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
            onChange={(e) => setUrl(e.target.value)}
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
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-accent focus:border-accent min-h-[100px]"
            placeholder="e.g. Free shipping on orders over $50"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="attachment" className="block text-sm font-medium text-slate-700 mb-1">
            Claim Evidence / Attachment (Optional)
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
            <option value="CONTROLLED">CONTROLLED (Mock Environment)</option>
            <option value="AUTHORIZED_LIVE">AUTHORIZED_LIVE (Real Environment)</option>
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
          {isLoading ? 'Running experiment...' : 'Run Check'}
        </button>
      </div>
    </form>
  );
};
