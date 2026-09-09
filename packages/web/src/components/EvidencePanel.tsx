import React from 'react';
import type { Run } from '../api/types';
import { ShieldAlert, Fingerprint, Activity } from 'lucide-react';

interface EvidencePanelProps {
  run: Run;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ run }) => {
  if (run.status !== 'COMPLETED' && run.status !== 'FAILED') return null;

  const isBoundary = run.primitive === 'BOUNDARY';
  const isCanary = run.primitive === 'CANARY';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Evidence Details</h3>
      </div>
      
      <div className="p-6 space-y-6">
        {isBoundary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="block text-sm font-medium text-slate-500 mb-1">Claimed Boundary</span>
              <span className="text-xl font-mono text-slate-900">
                {run.claimedBoundary !== undefined && run.claimedBoundary !== null ? run.claimedBoundary : 'N/A'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="block text-sm font-medium text-slate-500 mb-1">Observed Boundary</span>
              <span className="text-xl font-mono text-slate-900">
                {run.observedBoundary !== undefined && run.observedBoundary !== null ? run.observedBoundary : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {isCanary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-medium pb-2 border-b border-slate-100">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Canary Marker Detections
            </div>
            
            {(!run.observations || run.observations.length === 0) ? (
              <p className="text-sm text-slate-500">No network observations recorded.</p>
            ) : (
              <ul className="space-y-3">
                {run.observations.map((obs, i) => {
                  const markers = obs.canaryMarkers || [];
                  if (markers.length === 0) return null;
                  
                  return (
                    <li key={i} className="flex flex-col gap-1 p-3 bg-rose-50 border border-rose-100 rounded-md">
                      <div className="flex items-center gap-2 text-sm text-rose-800 font-medium">
                        <Fingerprint className="w-4 h-4" />
                        Marker Leak Detected
                      </div>
                      <div className="text-xs font-mono text-rose-600 break-all bg-white p-2 rounded border border-rose-100 mt-1">
                        URL: {obs.url}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* DOM Observations / Extra evidence */}
        {run.observations && run.observations.some(obs => obs.domObservations && Object.keys(obs.domObservations).length > 0) && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-700 mb-3">DOM State Samples</h4>
            <div className="space-y-2">
              {run.observations.map((obs, idx) => {
                if (!obs.domObservations || Object.keys(obs.domObservations).length === 0) return null;
                return (
                  <div key={idx} className="text-xs font-mono bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto">
                    {Object.entries(obs.domObservations).map(([key, val]) => (
                      <div key={key} className="mb-1">
                        <span className="text-accent">[{key}]</span>: {val}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
