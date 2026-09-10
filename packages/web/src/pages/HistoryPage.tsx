import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run, Verdict, Primitive } from '../api/types';
import { Trash2, Play, ChevronRight, Activity, Filter } from 'lucide-react';

const VERDICT_BADGE: Record<string, string> = {
  SUPPORTED: 'bg-verdict-supported/10 text-verdict-supported border-verdict-supported/30',
  CONTRADICTED: 'bg-verdict-contradicted/10 text-verdict-contradicted border-verdict-contradicted/30',
  INCONCLUSIVE: 'bg-verdict-inconclusive/10 text-verdict-inconclusive border-verdict-inconclusive/30'
};

export function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtering states
  const [filterVerdict, setFilterVerdict] = useState<Verdict | 'ALL'>('ALL');
  const [filterPrimitive, setFilterPrimitive] = useState<Primitive | 'ALL'>('ALL');

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

  const filteredRuns = runs.filter(run => {
    if (filterVerdict !== 'ALL' && run.verdict !== filterVerdict) return false;
    if (filterPrimitive !== 'ALL' && run.primitive !== filterPrimitive) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
        <h3 className="text-red-400 font-bold mb-1">Error Loading History</h3>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-6 h-6 text-cyan-accent" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white text-glow">VERIFICATION LOGS</h1>
          </div>
          <p className="text-sm text-slate-muted font-mono">Total records: {runs.length} | Filtered: {filteredRuns.length}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-navy-surface p-2 rounded-lg border border-navy-border">
          <div className="flex items-center gap-2 pl-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter</span>
          </div>
          <div className="h-4 w-px bg-navy-border mx-1" />
          
          <select 
            value={filterVerdict} 
            onChange={(e) => setFilterVerdict(e.target.value as any)}
            className="bg-navy-bg border border-navy-border text-xs font-bold text-off-white rounded px-2 py-1.5 uppercase outline-none focus:border-cyan-accent"
          >
            <option value="ALL">All Verdicts</option>
            <option value="SUPPORTED">Supported</option>
            <option value="CONTRADICTED">Contradicted</option>
            <option value="INCONCLUSIVE">Inconclusive</option>
          </select>

          <select 
            value={filterPrimitive} 
            onChange={(e) => setFilterPrimitive(e.target.value as any)}
            className="bg-navy-bg border border-navy-border text-xs font-bold text-off-white rounded px-2 py-1.5 uppercase outline-none focus:border-cyan-accent"
          >
            <option value="ALL">All Primitives</option>
            <option value="BOUNDARY">Boundary</option>
            <option value="CANARY">Canary</option>
          </select>
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="flex flex-col gap-3">
        {runs.length === 0 ? (
          <div className="text-center py-20 text-slate-muted glass-panel rounded-xl border-dashed">
            <p className="text-xl font-bold mb-2 text-off-white">No verification logs found</p>
            <p className="text-sm font-mono">Execute a verification from the command center.</p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="text-center py-20 text-slate-muted glass-panel rounded-xl">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No logs match filters</p>
          </div>
        ) : (
          filteredRuns.map(run => (
            <div
              key={run.id}
              className="group flex flex-col lg:flex-row gap-4 p-4 glass-panel rounded-lg border border-navy-border hover:border-cyan-accent/50 hover:bg-cyan-accent/[0.02] transition-colors relative"
            >
              {/* STATUS COLUMN */}
              <div className="w-full lg:w-48 shrink-0 flex flex-row lg:flex-col items-center lg:items-start gap-3 lg:gap-2">
                <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-widest w-fit ${VERDICT_BADGE[run.verdict || 'INCONCLUSIVE']}`}>
                  {run.verdict || 'INCONCLUSIVE'}
                </div>
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-1 text-[10px] uppercase font-bold text-slate-muted tracking-widest">
                  <span className="bg-navy-bg border border-navy-border px-1.5 py-0.5 rounded text-off-white w-fit">{run.primitive}</span>
                  <span className="px-1.5 py-0.5">{run.executionMode}</span>
                </div>
              </div>

              {/* DETAILS COLUMN */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                <h3 className="text-sm md:text-base font-bold text-off-white truncate" title={run.claim}>
                  {run.claim}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-accent">
                  <span className="truncate">{run.targetUrl ? new URL(run.targetUrl).hostname : 'Unknown Target'}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 lg:line-clamp-2 md:max-w-3xl">
                  {run.verdictReason || 'No detailed reason provided.'}
                </p>
              </div>

              {/* METADATA & ACTIONS COLUMN */}
              <div className="w-full lg:w-auto shrink-0 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 border-navy-border pt-3 lg:pt-0 mt-2 lg:mt-0">
                
                <div className="text-[10px] font-mono text-slate-muted text-left lg:text-right">
                  <div>{new Date(run.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div>{new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                </div>
                
                <div className="flex items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                  <button
                    onClick={(e) => handleDelete(run.id, e)}
                    disabled={deletingId === run.id}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="Delete Run"
                  >
                    {deletingId === run.id ? (
                      <div className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <Link
                    to={`/runs/${run.id}?action=replay`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-navy-surface border border-navy-border text-off-white text-[10px] font-bold uppercase tracking-widest rounded hover:border-cyan-accent transition-colors"
                    title="Replay Execution"
                  >
                    <Play className="w-3 h-3" />
                    <span className="hidden sm:inline">Replay</span>
                  </Link>

                  <Link
                    to={`/runs/${run.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-accent text-navy-bg text-[10px] font-bold uppercase tracking-widest rounded hover:bg-cyan-accent/80 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  >
                    <span className="hidden sm:inline">Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
