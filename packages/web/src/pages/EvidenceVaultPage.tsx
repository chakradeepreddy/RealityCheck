import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Run } from '../api/types';

interface EvidenceItem {
  runId: string;
  claim: string;
  type: 'SCREENSHOT' | 'CLAIM_REFERENCE';
  url: string;
  timestamp: string;
}

import { API_BASE_URL } from '../config';

export function EvidenceVaultPage() {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvidence() {
      try {
        const runs = await apiClient.getAllRuns();
        const items: EvidenceItem[] = [];

        runs.forEach(run => {
          if (run.claimAttachmentPath) {
            items.push({
              runId: run.id,
              claim: run.claim,
              type: 'CLAIM_REFERENCE',
              url: `${API_BASE_URL}/evidence/${run.claimAttachmentPath}`,
              timestamp: run.startedAt,
            });
          }

          if (run.observations) {
            run.observations.forEach(obs => {
              if (obs.evidenceRefs?.screenshotPath) {
                items.push({
                  runId: run.id,
                  claim: run.claim,
                  type: 'SCREENSHOT',
                  url: `${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`,
                  timestamp: obs.timestamp,
                });
              }
            });
          }
        });

        // Sort descending by timestamp
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvidenceList(items);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch evidence vault');
      } finally {
        setLoading(false);
      }
    }
    fetchEvidence();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading vault...</div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">EVIDENCE VAULT</h1>
        <p className="text-slate-500 text-sm">All captured runtime screenshots and claim references.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evidenceList.length === 0 ? (
          <p className="text-slate-500 col-span-full">No evidence stored yet.</p>
        ) : (
          evidenceList.map((item, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-slate-100 relative group overflow-hidden border-b border-slate-200">
                <img 
                  src={item.url} 
                  alt="Evidence" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-slate-900/75 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-all transform translate-y-2 group-hover:translate-y-0">
                    View Full Size
                  </span>
                </div>
              </a>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'CLAIM_REFERENCE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 line-clamp-2 mb-3" title={item.claim}>
                    {item.claim}
                  </h3>
                </div>
                <Link to={`/runs/${item.runId}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center group">
                  View Run Context
                  <svg className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
