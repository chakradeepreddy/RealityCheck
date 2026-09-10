import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run } from '../api/types';

const VERDICT_BADGE: Record<string, string> = {
  SUPPORTED: 'bg-emerald-100 text-emerald-800',
  CONTRADICTED: 'bg-red-100 text-red-800',
  INCONCLUSIVE: 'bg-amber-100 text-amber-800'
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">VERIFICATION HISTORY</h1>
        <span className="text-sm text-slate-400">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-4">
        {runs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium mb-2">No verification runs yet</p>
            <p className="text-sm">Use the quick presets on the home page to get started.</p>
          </div>
        ) : (
          runs.map(run => (
            <div
              key={run.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              {/* Delete button — top right */}
              <button
                id={`delete-run-${run.id}`}
                onClick={(e) => handleDelete(run.id, e)}
                disabled={deletingId === run.id}
                className="absolute top-4 right-4 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
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

              <div className="flex justify-between items-start mb-4 pr-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      VERDICT_BADGE[run.verdict || 'INCONCLUSIVE'] || VERDICT_BADGE.INCONCLUSIVE
                    }`}>
                      {run.verdict || '—'}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">{run.primitive}</span>
                    <span className="text-sm text-slate-400">({run.executionMode})</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{run.claim}</h3>
                </div>
                <div className="text-right text-sm text-slate-400 shrink-0">
                  {new Date(run.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <br />
                  {new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                <div>
                  <span className="text-slate-500 block mb-0.5">Target:</span>
                  <a href={run.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs font-mono">
                    {new URL(run.targetUrl).hostname}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Reason:</span>
                  <span className="text-slate-700 text-xs line-clamp-2">{run.verdictReason || 'No summary available.'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/runs/${run.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors"
                >
                  View Details →
                </Link>
                <Link
                  to={`/runs/${run.id}?action=replay`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none transition-colors"
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
