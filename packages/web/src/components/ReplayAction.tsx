import React, { useState } from 'react';
import { ExecutionMode } from '../api/types';
import { RefreshCw } from 'lucide-react';

interface ReplayActionProps {
  runId: string;
  onReplay: (runId: string, mode: ExecutionMode) => void;
  isLoading: boolean;
}

export const ReplayAction: React.FC<ReplayActionProps> = ({ runId, onReplay, isLoading }) => {
  const [mode, setMode] = useState<ExecutionMode>('CONTROLLED');

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between mt-6">
      <div>
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-500" />
          Replay Experiment
        </h4>
        <p className="text-sm text-slate-500 mt-1">
          Run the exact same ExperimentSpec against the target to verify consistency.
        </p>
      </div>
      
      <div className="flex w-full md:w-auto items-center gap-3">
        <select
          className="px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-accent focus:border-accent text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as ExecutionMode)}
          disabled={isLoading}
        >
          <option value="CONTROLLED">CONTROLLED</option>
          <option value="AUTHORIZED_LIVE">AUTHORIZED_LIVE</option>
        </select>
        
        <button
          onClick={() => onReplay(runId, mode)}
          disabled={isLoading}
          className="whitespace-nowrap bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-md hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Replaying...' : 'Replay Run'}
        </button>
      </div>
    </div>
  );
};
