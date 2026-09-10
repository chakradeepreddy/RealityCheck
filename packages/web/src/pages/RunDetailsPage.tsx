import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RunStatusViewer } from '../components/RunStatusViewer';
import { ReplayAction } from '../components/ReplayAction';
import { apiClient } from '../api/client';
import type { Run, ExecutionMode } from '../api/types';
import { API_BASE_URL } from '../config';
import { ArrowLeft, ExternalLink, Trash2, Activity, CheckCircle2, XOctagon, HelpCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

export function RunDetailsPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRun = async () => {
      if (!runId) return;
      try {
        const run = await apiClient.getRun(runId);
        if (mounted) {
          setCurrentRun(run);
          setIsLoading(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-accent"></div>
      </div>
    );
  }

  if (error || !currentRun) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center max-w-md mx-auto mt-12">
        <h3 className="text-red-400 font-bold mb-2">Error Loading Report</h3>
        <p className="text-red-300 text-sm mb-6">{error || 'Run not found'}</p>
        <button onClick={() => navigate('/history')} className="px-4 py-2 bg-navy-surface border border-navy-border rounded text-off-white hover:border-cyan-accent transition-colors">
          Return to History
        </button>
      </div>
    );
  }

  const isBoundary = currentRun.primitive === 'BOUNDARY';
  const isCanary = currentRun.primitive === 'CANARY';

  const verdictStyles = {
    SUPPORTED: 'bg-verdict-supported/10 text-verdict-supported border-verdict-supported/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    CONTRADICTED: 'bg-verdict-contradicted/10 text-verdict-contradicted border-verdict-contradicted/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    INCONCLUSIVE: 'bg-verdict-inconclusive/10 text-verdict-inconclusive border-verdict-inconclusive/30 shadow-[0_0_20px_rgba(148,163,184,0.15)]'
  };

  const currentVerdictStyle = currentRun.verdict ? verdictStyles[currentRun.verdict] : verdictStyles.INCONCLUSIVE;
  const VerdictIcon = currentRun.verdict === 'SUPPORTED' ? CheckCircle2 : currentRun.verdict === 'CONTRADICTED' ? XOctagon : HelpCircle;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-navy-border pb-4">
        <div>
          <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-slate-500 hover:text-cyan-accent transition-colors text-xs font-bold uppercase tracking-widest mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-cyan-accent" />
            <h1 className="text-2xl font-black tracking-tight text-off-white text-glow">EVIDENCE REPORT</h1>
          </div>
          <RunStatusViewer status={currentRun.status} />
        </div>
        <div className="text-left md:text-right text-xs font-mono text-slate-muted">
          ID: {currentRun.id}<br/>
          {new Date(currentRun.startedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
        
        {/* 1. VERDICT & CLAIM */}
        <section className="flex flex-col items-center text-center space-y-6">
          <div className={clsx("inline-flex items-center gap-3 px-8 py-4 rounded-2xl border-2 uppercase tracking-widest font-black text-2xl md:text-4xl", currentVerdictStyle)}>
            <VerdictIcon className="w-8 h-8 md:w-10 md:h-10" />
            {currentRun.verdict || 'INCONCLUSIVE'}
          </div>
          
          <div className="w-full">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">The Claim</h2>
            <p className="text-2xl md:text-3xl font-bold text-off-white leading-tight">"{currentRun.claim}"</p>
          </div>
        </section>

        {/* 2. WHY (Logical deduction) */}
        {(currentRun.status === 'COMPLETED' || currentRun.verdictReason) && (
          <section className="glass-panel p-6 md:p-8 rounded-2xl border border-navy-border relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-cyan-accent uppercase tracking-widest mb-6">Logical Deduction</h3>
            
            {isBoundary ? (
              <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 mb-8">
                <div className="flex-1 bg-navy-bg border border-navy-border rounded-xl p-4 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Claimed Expectation</div>
                  <div className="text-2xl font-mono text-off-white">{currentRun.claimedBoundary !== null ? currentRun.claimedBoundary : 'N/A'}</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-slate-600">
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                </div>
                <div className="flex-1 bg-navy-bg border border-navy-border rounded-xl p-4 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Observed Reality</div>
                  <div className="text-2xl font-mono text-cyan-accent">{currentRun.observedBoundary !== null ? currentRun.observedBoundary : 'N/A'}</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-slate-600">
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                </div>
                <div className="flex-1 bg-navy-bg border border-navy-border rounded-xl p-4 text-center flex flex-col justify-center items-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Therefore</div>
                  <div className={clsx("text-xl font-black uppercase tracking-widest", 
                    currentRun.verdict === 'SUPPORTED' ? 'text-verdict-supported' : 
                    currentRun.verdict === 'CONTRADICTED' ? 'text-verdict-contradicted' : 'text-verdict-inconclusive')}>
                    {currentRun.verdict || 'INCONCLUSIVE'}
                  </div>
                </div>
              </div>
            ) : isCanary ? (
              <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 mb-8">
                 <div className="flex-1 bg-navy-bg border border-navy-border rounded-xl p-4 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Observation Focus</div>
                  <div className="text-lg font-mono text-off-white">Canary Token Tracking</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-slate-600">
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                </div>
                <div className="flex-1 bg-navy-bg border border-navy-border rounded-xl p-4 text-center flex flex-col justify-center items-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Therefore</div>
                  <div className={clsx("text-xl font-black uppercase tracking-widest", 
                    currentRun.verdict === 'SUPPORTED' ? 'text-verdict-supported' : 
                    currentRun.verdict === 'CONTRADICTED' ? 'text-verdict-contradicted' : 'text-verdict-inconclusive')}>
                    {currentRun.verdict || 'INCONCLUSIVE'}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="bg-[#07111F] p-4 rounded-xl border border-navy-border">
               <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Engine Output</div>
               <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">{currentRun.verdictReason || 'No detailed reason provided.'}</p>
            </div>
          </section>
        )}

        {/* 3. WHAT WE TESTED */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Target Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Primitive</span>
              <span className="text-off-white font-mono">{currentRun.primitive}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Execution Mode</span>
              <span className="text-off-white font-mono">{currentRun.executionMode}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Target URL</span>
              <a href={currentRun.targetUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-accent hover:underline flex items-center gap-1 font-mono truncate">
                {new URL(currentRun.targetUrl).hostname} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
        </section>

        {/* 4. RUNTIME EVIDENCE GALLERY */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-navy-border pb-2">Runtime Evidence</h3>
          
          {currentRun.observations && currentRun.observations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentRun.observations.map((obs, idx) => (
                <div key={idx} className="glass-panel rounded-xl overflow-hidden border border-navy-border flex flex-col">
                  {/* Image Area */}
                  {obs.evidenceRefs?.screenshotPath ? (
                    <div 
                      className="relative aspect-video bg-navy-bg cursor-pointer group border-b border-navy-border"
                      onClick={() => setExpandedImage(`${API_BASE_URL}/evidence/${obs.evidenceRefs!.screenshotPath}`)}
                    >
                      <img 
                        src={`${API_BASE_URL}/evidence/${obs.evidenceRefs.screenshotPath}`} 
                        alt={`Observation ${idx}`} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      />
                      <div className="absolute inset-0 bg-navy-bg/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-off-white" />
                      </div>
                      <div className="absolute top-2 left-2 bg-navy-bg/90 backdrop-blur text-off-white text-[10px] font-mono px-2 py-1 rounded border border-navy-border shadow">
                        SEQ: {obs.sequenceIndex}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-[#07111F] border-b border-navy-border flex items-center justify-center flex-col text-slate-600">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">No Screenshot</span>
                    </div>
                  )}

                  {/* Metadata Area */}
                  <div className="p-4 bg-navy-surface flex-1 flex flex-col">
                    <div className="text-[10px] text-cyan-accent font-mono mb-2 truncate" title={obs.url}>{obs.url}</div>
                    
                    <div className="mt-auto">
                      {obs.canaryMarkers && obs.canaryMarkers.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-verdict-contradicted font-bold uppercase tracking-widest bg-verdict-contradicted/10 px-2 py-1 rounded border border-verdict-contradicted/30 mb-2 w-fit">
                          <ShieldAlert className="w-3 h-3" /> Leak Detected
                        </div>
                      )}
                      
                      <div className="text-[10px] text-slate-500 font-mono">
                        TS: {obs.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-xl text-center border-dashed">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Runtime Evidence Available</p>
            </div>
          )}
        </section>

        {/* 5. USER CLAIM REFERENCE */}
        {currentRun.claimAttachmentPath && (
          <section>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-navy-border pb-2">User Claim Attachment</h3>
            <div className="glass-panel rounded-xl p-2 border border-navy-border inline-block">
              <img 
                src={`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath}`} 
                alt="Claim Reference" 
                className="max-h-64 rounded-lg cursor-pointer"
                onClick={() => setExpandedImage(`${API_BASE_URL}/evidence/${currentRun.claimAttachmentPath!}`)}
              />
            </div>
          </section>
        )}

        {/* 6. ACTIONS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-navy-border">
          <div className="glass-panel p-6 rounded-xl border border-navy-border">
            <h3 className="text-[10px] font-bold text-cyan-accent uppercase tracking-widest mb-2">Re-execute</h3>
            <p className="text-xs text-slate-400 mb-6">Run this exact experiment configuration again. Does not recompile the claim.</p>
            <ReplayAction runId={currentRun.id} onReplay={handleReplay} isLoading={isReplaying} />
          </div>
          
          <div className="glass-panel p-6 rounded-xl border border-red-500/30 bg-red-500/5">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Danger Zone</h3>
            <p className="text-xs text-slate-400 mb-6">Permanently delete this verification log and all associated runtime evidence.</p>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-lg text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 disabled:opacity-50 transition-all uppercase tracking-widest"
            >
              {isDeleting ? 'Deleting...' : 'Delete Verification Log'}
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </section>

      </div>

      {/* IMAGE EXPANSION MODAL */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 bg-[#07111F]/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_50px_rgba(34,211,238,0.1)] border border-navy-border"
          />
        </div>
      )}

    </div>
  );
}
