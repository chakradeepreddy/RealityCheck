import React, { useState } from 'react';
import type { ExecutionMode } from '../api/types';
import { RefreshCw } from 'lucide-react';

interface ReplayActionProps {
  runId: string;
  onReplay: (runId: string, mode: ExecutionMode) => void;
  isLoading: boolean;
}

export const ReplayAction: React.FC<ReplayActionProps> = ({ runId, onReplay, isLoading }) => {
  const [mode, setMode] = useState<ExecutionMode>('CONTROLLED');

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-3">
        <select
          className="w-full px-4 py-3 bg-navy-surface border border-navy-border rounded-xl text-off-white text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-cyan-accent/50 focus:border-cyan-accent/50 outline-none transition-all appearance-none cursor-pointer"
          value={mode}
          onChange={(e) => setMode(e.target.value as ExecutionMode)}
          disabled={isLoading}
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
        >
          <option value="CONTROLLED" className="bg-navy-bg text-off-white">CONTROLLED</option>
          <option value="AUTHORIZED_LIVE" className="bg-navy-bg text-off-white">AUTHORIZED LIVE</option>
        </select>
        
        <button
          onClick={() => onReplay(runId, mode)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-accent hover:bg-cyan-accent/80 text-navy-bg shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] font-bold uppercase tracking-widest py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Replaying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Replay Run
            </>
          )}
        </button>
      </div>
    </div>
  );
};
