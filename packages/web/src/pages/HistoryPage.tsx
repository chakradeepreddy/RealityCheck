import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run } from '../api/types';

const VERDICT_BADGE: Record<string, string> = {
  SUPPORTED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  CONTRADICTED: 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
  INCONCLUSIVE: 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
};

export function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const data = await apiClient.getAllRuns();
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this verification run? This cannot be undone.')) return;

    setDeletingId(runId);
    try {
      await apiClient.deleteRun(runId);
      setRuns(prev => prev.filter(r => r.id !== runId));
    } catch (err: any) {
      alert(err.data?.error || err.message || 'Failed to delete run');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white text-glow">VERIFICATION HISTORY</h1>
        <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">{runs.length} RUN{runs.length !== 1 ? 'S' : ''}</span>
      </div>

      <div className="grid gap-6">
        {runs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 glass-panel rounded-2xl">
            <p className="text-xl font-bold mb-2 text-slate-300">No verification runs yet</p>
            <p className="text-sm">Use the quick presets on the home page to get started.</p>
          </div>
        ) : (
          runs.map(run => (
            <div
              key={run.id}
              className="glass-panel rounded-xl p-6 transition-all hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] relative group"
            >
              {/* Delete button — top right */}
              <button
                id={`delete-run-${run.id}`}
                onClick={(e) => handleDelete(run.id, e)}
                disabled={deletingId === run.id}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                title="Delete run"
                aria-label="Delete run"
              >
                {deletingId === run.id ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                )}
              </button>

              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:pr-12 gap-3 sm:gap-0">
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      VERDICT_BADGE[run.verdict || 'INCONCLUSIVE'] || VERDICT_BADGE.INCONCLUSIVE
                    }`}>
                      {run.verdict || '—'}
                    </span>
                    <span className="text-xs bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50 text-slate-300 font-bold tracking-wide uppercase">{run.primitive}</span>
                    <span className="text-xs text-slate-500 font-mono">({run.executionMode})</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-200 transition-colors">{run.claim}</h3>
                </div>
                <div className="text-left sm:text-right text-[10px] font-bold tracking-widest uppercase text-slate-500 shrink-0 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/60">
                  {new Date(run.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="sm:hidden mx-2"> &middot; </span>
                  <br className="hidden sm:block" />
                  {new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6 bg-slate-900/30 p-4 rounded-xl border border-slate-800/40">
                <div>
                  <span className="text-slate-500 block mb-1 text-[10px] uppercase font-bold tracking-widest">Target:</span>
                  <a href={run.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline break-all text-xs font-mono font-medium">
                    {new URL(run.targetUrl).hostname}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1 text-[10px] uppercase font-bold tracking-widest">Reason:</span>
                  <span className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{run.verdictReason || 'No summary available.'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/runs/${run.id}`}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  View Details
                </Link>
                <Link
                  to={`/runs/${run.id}?action=replay`}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  Replay
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
