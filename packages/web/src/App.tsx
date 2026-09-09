import React, { useState } from 'react';
import { ExperimentForm } from './components/ExperimentForm';
import { RunStatusViewer } from './components/RunStatusViewer';
import { VerdictDisplay } from './components/VerdictDisplay';
import { EvidencePanel } from './components/EvidencePanel';
import { ReplayAction } from './components/ReplayAction';
import { apiClient } from './api/client';
import type { Run, ExecutionMode } from './api/types';

export default function App() {
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunNewExperiment = async (url: string, claim: string, mode: ExecutionMode) => {
    setIsLoading(true);
    setError(null);
    setCurrentRun(null);

    try {
      const run = await apiClient.createRun(claim, url, mode);
      setCurrentRun(run);
    } catch (err: any) {
      setError(err.data?.error || err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplay = async (runId: string, mode: ExecutionMode) => {
    setIsLoading(true);
    setError(null);

    try {
      const run = await apiClient.replayRun(runId, mode);
      setCurrentRun(run);
    } catch (err: any) {
      setError(err.data?.error || err.message || 'An unexpected error occurred during replay.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 py-6 px-4 md:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src="/logo.jpg" alt="RealityCheck Logo" className="w-10 h-10 rounded-lg shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">RealityCheck</h1>
            <p className="text-slate-500 text-sm font-medium">Don't just read the claim. Run it.</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <section>
          <ExperimentForm onSubmit={handleRunNewExperiment} isLoading={isLoading} />
        </section>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
            <h3 className="text-red-800 font-medium">Execution Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {currentRun && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold text-slate-800">Experiment Results</h2>
              <RunStatusViewer status={currentRun.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <VerdictDisplay verdict={currentRun.verdict} reason={currentRun.verdictReason} />
                <EvidencePanel run={currentRun} />
                
                {(currentRun.status === 'COMPLETED' || currentRun.status === 'FAILED') && (
                  <ReplayAction runId={currentRun.id} onReplay={handleReplay} isLoading={isLoading} />
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Run Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Run ID</dt>
                      <dd className="font-mono text-xs mt-0.5 break-all text-slate-700">{currentRun.id}</dd>
                    </div>
                    {currentRun.originalRunId && (
                      <div>
                        <dt className="text-slate-500">Original Run ID</dt>
                        <dd className="font-mono text-xs mt-0.5 break-all text-slate-700">{currentRun.originalRunId}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-slate-500">Target URL</dt>
                      <dd className="font-medium mt-0.5 break-all text-blue-600">{currentRun.targetUrl}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Primitive</dt>
                      <dd className="font-medium mt-0.5 text-slate-700">{currentRun.primitive}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Execution Mode</dt>
                      <dd className="font-medium mt-0.5 text-slate-700">{currentRun.executionMode}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
