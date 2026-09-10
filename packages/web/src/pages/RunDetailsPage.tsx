import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RunStatusViewer } from '../components/RunStatusViewer';
import { ReplayAction } from '../components/ReplayAction';
import { apiClient } from '../api/client';
import type { Run, ExecutionMode } from '../api/types';
import { API_BASE_URL } from '../config';

export function RunDetailsPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRun = async () => {
      if (!runId) return;
      try {
        const run = await apiClient.getRun(runId);
        if (mounted) {
          setCurrentRun(run);
          setIsLoading(false);
          // Simple polling if run is still running
          if (run.status === 'RUNNING' || run.status === 'NOT_RUN') {
            setTimeout(() => {
              if (mounted) fetchRun();
            }, 2000);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.data?.error || err.message || 'Failed to load run details.');
          setIsLoading(false);
        }
      }
    };
    fetchRun();
    return () => { mounted = false; };
  }, [runId]);

  const handleReplay = async (replayRunId: string, mode: ExecutionMode) => {
    setIsReplaying(true);
    setError(null);
    try {
      const run = await apiClient.replayRun(replayRunId, mode);
      navigate(`/runs/${run.id}`);
    } catch (err: any) {
      setError(err.data?.error || err.message || 'An unexpected error occurred during replay.');
    } finally {
      setIsReplaying(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRun) return;
    if (!confirm('Delete this verification run and all its evidence? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteRun(currentRun.id);
      navigate('/history');
    } catch (err: any) {
      setError(err.data?.error || err.message || 'Failed to delete run.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !currentRun) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error || 'Run not found'}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-blue-600 hover:underline">
          &larr; Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => navigate('/history')} className="text-slate-500 hover:text-slate-900 transition-colors">
          &larr; Back to History
        </button>
        <h2 className="text-xl font-semibold text-slate-800 flex-1">VERIFICATION RESULT</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-8">
          
          {/* VERDICT SUMMARY */}
          <div>
            <div className={`inline-flex px-6 py-3 rounded-full text-lg font-black uppercase tracking-widest mb-4 border ${
              currentRun.verdict === 'SUPPORTED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' :
              currentRun.verdict === 'CONTRADICTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]' :
              'bg-slate-800/80 text-slate-300 border-slate-700/50 shadow-sm'
            }`}>
              {currentRun.verdict}
            </div>
            <h3 className="text-2xl font-black text-white mb-2 text-glow">Claim: {currentRun.claim}</h3>
            <p className="text-slate-400">Target: <a href={currentRun.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">{currentRun.targetUrl}</a></p>
            <p className="text-slate-500 text-sm mt-1">Verified: {new Date(currentRun.startedAt).toLocaleString()}</p>
          </div>

          <hr className="border-slate-800/60" />

          <section>
            <h4 className="text-lg font-bold text-slate-200 mb-3 tracking-wide">WHY?</h4>
            <div className="glass-panel p-4 rounded-xl">
              <p className="text-slate-300 font-medium break-words whitespace-pre-wrap">{currentRun.verdictReason || 'No detailed reason provided.'}</p>
            </div>
          </section>

          <hr className="border-slate-800/60" />

          {/* WHAT WE TESTED */}
          {(currentRun.status === 'COMPLETED' || (currentRun.observations && currentRun.observations.length > 0)) && (
            <>
              <section>
                <h4 className="text-lg font-bold text-slate-200 mb-3 tracking-wide">WHAT WE TESTED</h4>
                <div className="glass-panel p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Primitive</span>
                    <span className="text-slate-200 break-words font-medium">{currentRun.primitive}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Execution Mode</span>
                    <span className="text-slate-200 break-words font-medium">{currentRun.executionMode}</span>
                  </div>
                </div>
              </section>

              <hr className="border-slate-800/60" />

              {/* RUNTIME EVIDENCE */}
              <section>
                <h4 className="text-xl font-black text-white mb-4 tracking-wide border-b-2 border-slate-800/60 pb-2 text-glow">VERIFICATION PROOFS</h4>
                {currentRun.observations && currentRun.observations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {currentRun.observations.map((obs, idx) => (
                      <div key={idx} className="glass-panel rounded-xl overflow-hidden shadow-lg group hover:border-blue-500/30 transition-all">
                        {obs.evidenceRefs?.screenshotPath ? (
                          <a href={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} target="_blank" rel="noopener noreferrer" className="block relative border-b border-slate-800/60">
                            <img src={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} alt={`Observation ${idx}`} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <span className="text-blue-300 text-sm font-bold tracking-wide text-glow">🔍 Click to expand proof</span>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-900/50 border-b border-slate-800/60 flex items-center justify-center text-slate-500 text-sm">
                            No Screenshot
                          </div>
                        )}
                        <div className="p-4 bg-slate-900/30">
                          <div className="text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-widest">Observation {idx + 1} State</div>
                          {obs.pageState ? (
                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-48 custom-scrollbar">
                              {JSON.stringify(obs.pageState, null, 2)}
                            </pre>
                          ) : obs.canaryMarkers ? (
                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-48 custom-scrollbar">
                              {JSON.stringify(obs.canaryMarkers, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-xs text-slate-500">No structured state</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No runtime evidence collected.</p>
                )}
              </section>

              {/* CLAIM REFERENCE */}
              {currentRun.claimAttachmentPath && (
                <>
                  <hr className="border-slate-800/60" />
                  <section>
                    <h4 className="text-lg font-bold text-slate-200 mb-3 tracking-wide">CLAIM REFERENCE</h4>
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-3">
                      <p className="text-sm text-purple-300 font-medium">User-provided claim context — not used to determine verdict.</p>
                    </div>
                    <a href={`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath}`} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-xl overflow-hidden border border-slate-700/50 shadow-md hover:border-blue-500/50 transition-all">
                      <img src={`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath}`} alt="Claim Reference" className="w-full h-auto" />
                    </a>
                  </section>
                </>
              )}

              <hr className="border-slate-800/60" />

              {/* VERIFICATION RESULTS */}
              <section>
                <h4 className="text-lg font-bold text-slate-200 mb-3 tracking-wide">FINAL VERDICT METRICS</h4>
                <div className="glass-panel p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Claimed Condition</span>
                    <span className="text-slate-100 font-black text-xl bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-700/50">{currentRun.claimedBoundary !== null ? currentRun.claimedBoundary : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/60 pt-4">
                    <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Observed Condition</span>
                    <span className="text-emerald-300 font-black text-xl bg-emerald-900/20 px-4 py-1.5 rounded-lg border border-emerald-500/30">{currentRun.observedBoundary !== null ? currentRun.observedBoundary : 'N/A'}</span>
                  </div>
                </div>
              </section>
            </>
          )}

        </div>
        
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl sticky top-[88px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h3 className="font-bold text-white mb-4 text-[10px] uppercase tracking-widest text-glow">Run Metadata</h3>
            <dl className="space-y-4 text-sm mb-6 relative z-10">
              <div>
                <dt className="text-slate-400 mb-1 text-[10px] uppercase tracking-widest font-bold">Run ID</dt>
                <dd className="font-mono text-xs break-all text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">{currentRun.id}</dd>
              </div>
              <div>
                <dt className="text-slate-400 mb-1 text-[10px] uppercase tracking-widest font-bold">Status</dt>
                <dd><RunStatusViewer status={currentRun.status} /></dd>
              </div>
            </dl>
            
            <div className="border-t border-slate-800/60 pt-6 relative z-10">
              <h4 className="font-bold text-white mb-2 text-[10px] uppercase tracking-widest text-glow">REPLAY</h4>
              <p className="text-xs text-slate-400 mb-4">Replay uses the stored ExperimentSpec and does not recompile the claim.</p>
              {(currentRun.status === 'COMPLETED' || currentRun.status === 'FAILED') && (
                <ReplayAction runId={currentRun.id} onReplay={handleReplay} isLoading={isReplaying} />
              )}
            </div>

            <div className="border-t border-slate-800/60 pt-6 mt-6 relative z-10">
              <h4 className="font-bold text-rose-400 mb-2 text-[10px] uppercase tracking-widest text-glow">DANGER ZONE</h4>
              <button
                id={`delete-run-${currentRun.id}`}
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50 transition-all uppercase tracking-wider"
              >
                {isDeleting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                )}
                Delete Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
