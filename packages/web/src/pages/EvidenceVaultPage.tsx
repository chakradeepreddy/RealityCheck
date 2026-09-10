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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white text-glow">EVIDENCE VAULT</h1>
        <p className="text-slate-400 text-sm font-medium tracking-wide">All captured runtime screenshots and claim references.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evidenceList.length === 0 ? (
          <p className="text-slate-400 col-span-full text-center glass-panel p-10 rounded-2xl font-bold tracking-wide">No evidence stored yet.</p>
        ) : (
          evidenceList.map((item, index) => (
            <div key={index} className="glass-panel rounded-xl overflow-hidden hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/40 transition-all flex flex-col group">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-slate-900/50 relative overflow-hidden border-b border-slate-800/60">
                <img 
                  src={item.url} 
                  alt="Evidence" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-slate-900/80 text-blue-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-slate-700/50 backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 text-glow">
                    View Full Size
                  </span>
                </div>
              </a>
              <div className="p-5 flex-1 flex flex-col justify-between bg-slate-900/30">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                      item.type === 'CLAIM_REFERENCE' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    }`}>
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-2 py-1 rounded border border-slate-800/60">
                      {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 line-clamp-2 mb-4 leading-relaxed group-hover:text-blue-200 transition-colors" title={item.claim}>
                    {item.claim}
                  </h3>
                </div>
                <Link to={`/runs/${item.runId}`} className="text-[10px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-widest inline-flex items-center group/link w-fit">
                  View Run Context
                  <svg className="w-3 h-3 ml-2 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
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
