import React from 'react';
import type { Run } from '../api/types';
import { ShieldAlert, Fingerprint, Activity } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface EvidencePanelProps {
  run: Run;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ run }) => {
  if (run.status !== 'COMPLETED' && run.status !== 'FAILED') return null;

  const isBoundary = run.primitive === 'BOUNDARY';
  const isCanary = run.primitive === 'CANARY';

  return (
    <div className="bg-navy-bg rounded-xl shadow-sm border border-navy-border overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-border bg-navy-surface flex items-center gap-2">
        <Activity className="w-5 h-5 text-slate-muted" />
        <h3 className="font-semibold text-off-white">Evidence Details</h3>
      </div>
      
      <div className="p-6 space-y-8">
        {/* User Attachment */}
        {run.claimAttachmentPath && (
          <div>
            <h4 className="text-sm font-medium text-off-white mb-3 border-b border-navy-border pb-2">Claim Attachment</h4>
            <div className="rounded-lg overflow-hidden border border-navy-border bg-navy-surface max-w-sm">
              <img 
                src={`${API_BASE_URL}/evidence/${run.claimAttachmentPath}`} 
                alt="Claim Evidence" 
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Browser Screenshots */}
        {run.observations && run.observations.some(obs => obs.evidenceRefs?.screenshotPath) && (
          <div>
            <h4 className="text-sm font-medium text-off-white mb-3 border-b border-navy-border pb-2">Execution Screenshots</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {run.observations.map((obs, idx) => {
                if (!obs.evidenceRefs?.screenshotPath) return null;
                return (
                  <div key={idx} className="rounded-lg overflow-hidden border border-navy-border bg-navy-surface relative group">
                    <img 
                      src={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} 
                      alt={`Observation ${idx + 1}`} 
                      className="w-full h-auto object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-navy-bg/90 text-off-white text-xs p-2 translate-y-full group-hover:translate-y-0 transition-transform border-t border-navy-border">
                      {obs.url}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isBoundary && (
          <div>
            <h4 className="text-sm font-medium text-off-white mb-3 border-b border-navy-border pb-2">Boundary Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-navy-surface rounded-lg border border-navy-border">
                <span className="block text-sm font-medium text-slate-muted mb-1">Claimed Boundary</span>
                <span className="text-xl font-mono text-cyan-accent">
                  {run.claimedBoundary !== undefined && run.claimedBoundary !== null ? run.claimedBoundary : 'N/A'}
                </span>
              </div>
              <div className="p-4 bg-navy-surface rounded-lg border border-navy-border">
                <span className="block text-sm font-medium text-slate-muted mb-1">Observed Boundary</span>
                <span className="text-xl font-mono text-verdict-supported">
                  {run.observedBoundary !== undefined && run.observedBoundary !== null ? run.observedBoundary : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {isCanary && (
          <div>
            <div className="flex items-center gap-2 text-off-white font-medium pb-2 border-b border-navy-border mb-4">
              <ShieldAlert className="w-4 h-4 text-verdict-inconclusive" />
              Canary Marker Detections
            </div>
            
            {(!run.observations || run.observations.length === 0) ? (
              <p className="text-sm text-slate-muted">No network observations recorded.</p>
            ) : (
              <ul className="space-y-3">
                {run.observations.map((obs, i) => {
                  const markers = obs.canaryMarkers || [];
                  if (markers.length === 0) return null;
                  
                  return (
                    <li key={i} className="flex flex-col gap-1 p-3 bg-verdict-contradicted/10 border border-verdict-contradicted/30 rounded-md">
                      <div className="flex items-center gap-2 text-sm text-verdict-contradicted font-medium">
                        <Fingerprint className="w-4 h-4" />
                        Marker Leak Detected
                      </div>
                      <div className="text-xs font-mono text-rose-300 break-all bg-navy-bg p-2 rounded border border-verdict-contradicted/30 mt-1">
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
          <div>
            <h4 className="text-sm font-medium text-off-white mb-3 border-b border-navy-border pb-2">DOM State Samples</h4>
            <div className="space-y-2">
              {run.observations.map((obs, idx) => {
                if (!obs.domObservations || Object.keys(obs.domObservations).length === 0) return null;
                return (
                  <div key={idx} className="text-xs font-mono bg-[#07111F] border border-navy-border text-slate-300 p-4 rounded-lg overflow-x-auto">
                    {Object.entries(obs.domObservations).map(([key, val]) => (
                      <div key={key} className="mb-1">
                        <span className="text-cyan-accent">[{key}]</span>: {val}
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
