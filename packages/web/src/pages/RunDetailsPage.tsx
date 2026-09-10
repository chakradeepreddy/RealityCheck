import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RunStatusViewer } from '../components/RunStatusViewer';
import { VerdictDisplay } from '../components/VerdictDisplay';
import { EvidencePanel } from '../components/EvidencePanel';
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
            <div className={`inline-flex px-6 py-3 rounded-full text-lg font-extrabold uppercase tracking-widest mb-4 shadow-sm border-2 ${
              currentRun.verdict === 'SUPPORTED' ? 'bg-green-100 text-green-800 border-green-300 shadow-green-100' :
              currentRun.verdict === 'CONTRADICTED' ? 'bg-red-100 text-red-800 border-red-300 shadow-red-100' :
              'bg-slate-100 text-slate-800 border-slate-300 shadow-slate-100'
            }`}>
              {currentRun.verdict}
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">Claim: {currentRun.claim}</h3>
            <p className="text-slate-600">Target: <a href={currentRun.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{currentRun.targetUrl}</a></p>
            <p className="text-slate-500 text-sm mt-1">Verified: {new Date(currentRun.startedAt).toLocaleString()}</p>
          </div>

          <hr className="border-slate-200" />

          {/* WHY? */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 mb-3">WHY?</h4>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-slate-700 font-medium">{currentRun.verdictReason || 'No detailed reason provided.'}</p>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* WHAT WE TESTED */}
          {(currentRun.status === 'COMPLETED' || (currentRun.observations && currentRun.observations.length > 0)) && (
            <>
              <section>
                <h4 className="text-lg font-bold text-slate-900 mb-3">WHAT WE TESTED</h4>
                <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Primitive</span>
                    <span className="text-slate-900">{currentRun.primitive}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Execution Mode</span>
                    <span className="text-slate-900">{currentRun.executionMode}</span>
                  </div>
                </div>
              </section>

              <hr className="border-slate-200" />

              {/* RUNTIME EVIDENCE */}
              <section>
                <h4 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight border-b-2 border-slate-200 pb-2">VERIFICATION PROOFS</h4>
                {currentRun.observations && currentRun.observations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {currentRun.observations.map((obs, idx) => (
                      <div key={idx} className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow">
                        {obs.evidenceRefs?.screenshotPath ? (
                          <a href={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} target="_blank" rel="noopener noreferrer" className="block relative group bg-slate-100 border-b border-slate-200">
                            <img src={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} alt={`Observation ${idx}`} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <span className="text-white text-sm font-semibold drop-shadow-md">🔍 Click to expand proof</span>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-50 border-b border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                            No Screenshot
                          </div>
                        )}
                        <div className="p-4 bg-slate-50">
                          <div className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Observation {idx + 1} State</div>
                          {obs.pageState ? (
                            <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap bg-white p-2 rounded border border-slate-200">
                              {JSON.stringify(obs.pageState, null, 2)}
                            </pre>
                          ) : obs.canaryMarkers ? (
                            <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap bg-white p-2 rounded border border-slate-200">
                              {JSON.stringify(obs.canaryMarkers, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-xs text-slate-400">No structured state</span>
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
                  <hr className="border-slate-200" />
                  <section>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">CLAIM REFERENCE</h4>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-3">
                      <p className="text-sm text-purple-800 font-medium">User-provided claim context — not used to determine verdict.</p>
                    </div>
                    <a href={`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath}`} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <img src={`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath}`} alt="Claim Reference" className="w-full h-auto" />
                    </a>
                  </section>
                </>
              )}

              <hr className="border-slate-200" />

              {/* VERIFICATION RESULTS */}
              <section>
                <h4 className="text-lg font-bold text-slate-900 mb-3">FINAL VERDICT METRICS</h4>
                <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl border border-slate-300 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Claimed Condition</span>
                    <span className="text-slate-900 font-black text-xl bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">{currentRun.claimedBoundary !== null ? currentRun.claimedBoundary : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Observed Condition</span>
                    <span className="text-blue-900 font-black text-xl bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-200">{currentRun.observedBoundary !== null ? currentRun.observedBoundary : 'N/A'}</span>
                  </div>
                </div>
              </section>
            </>
          )}

        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-6">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wider">Run Metadata</h3>
            <dl className="space-y-4 text-sm mb-6">
              <div>
                <dt className="text-slate-500 mb-1">Run ID</dt>
                <dd className="font-mono text-xs break-all text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">{currentRun.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">Status</dt>
                <dd><RunStatusViewer status={currentRun.status} /></dd>
              </div>
            </dl>
            
            <div className="border-t border-slate-200 pt-6">
              <h4 className="font-semibold text-slate-800 mb-2">REPLAY</h4>
              <p className="text-xs text-slate-500 mb-4">Replay uses the stored ExperimentSpec and does not recompile the claim.</p>
              {(currentRun.status === 'COMPLETED' || currentRun.status === 'FAILED') && (
                <ReplayAction runId={currentRun.id} onReplay={handleReplay} isLoading={isReplaying} />
              )}
            </div>

            <div className="border-t border-slate-200 pt-6 mt-6">
              <h4 className="font-semibold text-slate-800 mb-2">DANGER ZONE</h4>
              <button
                id={`delete-run-${currentRun.id}`}
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
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
