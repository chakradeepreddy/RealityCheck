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
            <div className={`inline-flex px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4 ${
              currentRun.verdict === 'SUPPORTED' ? 'bg-green-100 text-green-800' :
              currentRun.verdict === 'CONTRADICTED' ? 'bg-red-100 text-red-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {currentRun.verdict}
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">Claim: {currentRun.claim}</h3>
            <p className="text-slate-600">Target: <a href={currentRun.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{currentRun.targetUrl}</a></p>
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
            <h4 className="text-lg font-bold text-slate-900 mb-3">RUNTIME EVIDENCE</h4>
            {currentRun.observations && currentRun.observations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentRun.observations.map((obs, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    {obs.evidenceRefs?.screenshotPath ? (
                      <a href={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-slate-100 border-b border-slate-200 relative group">
                        <img src={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} alt={`Observation ${idx}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-xs px-2 py-1 rounded">View Screenshot</span>
                        </div>
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-50 border-b border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                        No Screenshot
                      </div>
                    )}
                    <div className="p-3 bg-slate-50">
                      <div className="text-xs text-slate-500 mb-1">Observation {idx + 1}</div>
                      {obs.pageState ? (
                        <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
                          {JSON.stringify(obs.pageState, null, 2)}
                        </pre>
                      ) : obs.canaryMarkers ? (
                         <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
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

          {/* VERIFICATION */}
          <section>
            <h4 className="text-lg font-bold text-slate-900 mb-3">VERIFICATION</h4>
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Claimed Condition</span>
                <span className="text-slate-900 font-bold">{currentRun.claimedBoundary !== null ? currentRun.claimedBoundary : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3">
                <span className="text-slate-500 font-medium">Observed Condition</span>
                <span className="text-slate-900 font-bold">{currentRun.observedBoundary !== null ? currentRun.observedBoundary : 'N/A'}</span>
              </div>
            </div>
          </section>

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
          </div>
        </div>
      </div>
    </div>
  );
}
