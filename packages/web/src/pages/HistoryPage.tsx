import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run } from '../api/types';

export function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchHistory();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading history...</div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">VERIFICATION HISTORY</h1>
      </div>

      <div className="grid gap-4">
        {runs.length === 0 ? (
          <p className="text-slate-500">No verification runs yet.</p>
        ) : (
          runs.map(run => (
            <div key={run.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                      run.verdict === 'SUPPORTED' ? 'bg-green-100 text-green-800' :
                      run.verdict === 'CONTRADICTED' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {run.verdict}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">{run.primitive}</span>
                    <span className="text-sm text-slate-500 font-medium">({run.executionMode})</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{run.claim}</h3>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <div className="text-sm text-slate-500">
                    {new Date(run.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="text-slate-500 block mb-1">Target:</span>
                  <a href={run.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {new URL(run.targetUrl).hostname}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Observed:</span>
                  <span className="text-slate-900 font-medium">{run.verdictReason || 'No summary available.'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link to={`/runs/${run.id}`} className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  View Verification
                </Link>
                {/* Replay button logic should navigate to run details and trigger replay, or do it inline. We'll link to details for now since details page supports replay */}
                <Link to={`/runs/${run.id}?action=replay`} className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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
