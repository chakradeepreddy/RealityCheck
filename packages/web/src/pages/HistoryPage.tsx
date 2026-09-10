import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run } from '../api/types';

const VERDICT_BADGE: Record<string, string> = {
  SUPPORTED: 'bg-verdict-supported/20 text-verdict-supported border-verdict-supported/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  CONTRADICTED: 'bg-verdict-contradicted/20 text-verdict-contradicted border-verdict-contradicted/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  INCONCLUSIVE: 'bg-verdict-inconclusive/20 text-verdict-inconclusive border-verdict-inconclusive/30 shadow-[0_0_10px_rgba(148,163,184,0.2)]'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-off-white" />
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
        <span className="text-sm font-bold text-cyan-accent bg-cyan-accent/10 px-3 py-1 rounded-full border border-cyan-accent/30">{runs.length} RUN{runs.length !== 1 ? 'S' : ''}</span>
      </div>

      <div className="grid gap-6">
        {runs.length === 0 ? (
          <div className="text-center py-20 text-slate-muted glass-panel rounded-2xl">
            <p className="text-xl font-bold mb-2 text-off-white">No verification runs yet</p>
            <p className="text-sm">Use the quick presets on the home page to get started.</p>
          </div>
        ) : (
          runs.map(run => (
            <div
              key={run.id}
              className="glass-panel rounded-xl p-6 transition-all hover:border-cyan-accent/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] relative group"
            >
              {/* Delete button — top right */}
              <button
                id={`delete-run-${run.id}`}
                onClick={(e) => handleDelete(run.id, e)}
                disabled={deletingId === run.id}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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
                    <span className="text-xs bg-navy-surface/80 px-2 py-0.5 rounded border border-navy-border text-off-white font-bold tracking-wide uppercase">{run.primitive}</span>
                    <span className="text-xs text-slate-muted font-mono">({run.executionMode})</span>
                  </div>
                  <h3 className="text-xl font-bold text-off-white line-clamp-2 leading-snug group-hover:text-cyan-accent transition-colors">{run.claim}</h3>
                </div>
                <div className="text-left sm:text-right text-[10px] font-bold tracking-widest uppercase text-slate-muted shrink-0 bg-navy-bg px-3 py-2 rounded-lg border border-navy-border">
                  {new Date(run.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="sm:hidden mx-2"> &middot; </span>
                  <br className="hidden sm:block" />
                  {new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6 bg-navy-bg p-4 rounded-xl border border-navy-border">
                <div>
                  <span className="text-slate-muted block mb-1 text-[10px] uppercase font-bold tracking-widest">Target:</span>
                  <a href={run.targetUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-accent hover:text-cyan-accent/80 hover:underline break-all text-xs font-mono font-medium">
                    {new URL(run.targetUrl).hostname}
                  </a>
                </div>
                <div>
                  <span className="text-slate-muted block mb-1 text-[10px] uppercase font-bold tracking-widest">Reason:</span>
                  <span className="text-off-white text-xs line-clamp-2 leading-relaxed">{run.verdictReason || 'No summary available.'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/runs/${run.id}`}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-cyan-accent hover:bg-cyan-accent/90 text-navy-bg shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  View Details
                </Link>
                <Link
                  to={`/runs/${run.id}?action=replay`}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-navy-surface hover:bg-navy-surface/80 text-off-white border border-navy-border hover:border-cyan-accent text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
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
