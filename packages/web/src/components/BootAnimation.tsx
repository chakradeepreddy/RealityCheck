import { useEffect, useState } from 'react';

interface BootAnimationProps {
  onComplete: () => void;
}

export function BootAnimation({ onComplete }: BootAnimationProps) {
  const [phase, setPhase] = useState<number>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    if (mediaQuery.matches) {
      // Reduced motion fallback: quick logo fade in and out
      setPhase(4);
      const t1 = setTimeout(() => setPhase(5), 1000);
      const t2 = setTimeout(onComplete, 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    const t1 = setTimeout(() => setPhase(2), 500);  // 0.5s: CHECKING REALITY
    const t2 = setTimeout(() => setPhase(3), 1000); // 1.0s: Pipeline
    const t3 = setTimeout(() => setPhase(4), 1600); // 1.6s: Logo + Tagline
    const t4 = setTimeout(() => setPhase(5), 2300); // 2.3s: Exit
    const t5 = setTimeout(onComplete, 2800);        // 2.8s: Done

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  if (prefersReducedMotion) {
    return (
      <div className={`fixed inset-0 z-[100] bg-[#07111F] flex items-center justify-center transition-opacity duration-500 ${phase === 5 ? 'opacity-0' : 'opacity-100'}`}>
        <h1 className="text-4xl font-black tracking-tight text-off-white">RealityCheck</h1>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] bg-[#07111F] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ease-out ${phase === 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Background forensic grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#22D3EE 1px, transparent 1px), linear-gradient(90deg, #22D3EE 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-cyan-accent/40" />
      <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-cyan-accent/40" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-cyan-accent/40" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-cyan-accent/40" />

      {/* Crosshairs */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-accent/10" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-accent/10" />

      {/* Center content wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-center h-48 w-full max-w-md">

        {/* Phase 1: CLAIM */}
        <div className={`absolute transition-all duration-200 ${phase === 1 ? 'opacity-100 scale-100 tracking-widest' : 'opacity-0 scale-95 tracking-tight'}`}>
          <div className="relative inline-block">
            <span className="text-4xl font-mono font-bold text-slate-300">CLAIM</span>
            {phase === 1 && <div className="absolute top-0 bottom-0 left-0 w-full bg-cyan-accent/20 border-l-2 border-cyan-accent animate-[scan-x_0.4s_linear_forwards]" />}
          </div>
        </div>

        {/* Phase 2: CHECKING REALITY */}
        <div className={`absolute transition-all duration-200 ${phase === 2 ? 'opacity-100 scale-100 tracking-widest' : 'opacity-0 scale-105 tracking-[0.5em]'}`}>
          <div className="relative overflow-hidden px-4 py-2 border border-cyan-accent/30 bg-cyan-accent/5">
            <span className="text-2xl font-mono font-bold text-cyan-accent animate-pulse">CHECKING REALITY</span>
            {phase === 2 && <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-accent shadow-[0_0_8px_#22D3EE] animate-[scan-y_0.4s_linear_infinite]" />}
          </div>
        </div>

        {/* Phase 3: Pipeline */}
        <div className={`absolute flex flex-col items-center gap-2 transition-all duration-300 ${phase === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col items-center text-xs font-mono font-bold text-slate-400">
            <span className="animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '0ms' }}>CLAIM</span>
            <span className="text-cyan-accent/50 animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '100ms' }}>↓</span>
            <span className="text-slate-300 animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '200ms' }}>EXPERIMENT</span>
            <span className="text-cyan-accent/50 animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '300ms' }}>↓</span>
            <span className="text-slate-200 animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '400ms' }}>EVIDENCE</span>
            <span className="text-cyan-accent/50 animate-[fade-in-up_0.2s_ease-out_both]" style={{ animationDelay: '500ms' }}>↓</span>
            <span className="text-cyan-accent animate-[fade-in-up_0.2s_ease-out_both] drop-shadow-[0_0_8px_#22D3EE]" style={{ animationDelay: '600ms' }}>VERDICT</span>
          </div>
        </div>

        {/* Phase 4: Final Logo */}
        <div className={`absolute flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${phase >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 blur-sm'}`}>
          <div className="relative mb-4">
             <div className="absolute inset-0 bg-cyan-accent rounded-xl blur-lg opacity-30" />
             <img src="/logo.jpg" alt="RealityCheck Logo" className="relative w-16 h-16 rounded-xl border-2 border-navy-border shadow-lg bg-white object-contain p-1" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-off-white text-glow mb-2">RealityCheck</h1>
          <p className="text-[10px] text-cyan-accent font-mono uppercase tracking-widest bg-cyan-accent/10 px-3 py-1 rounded border border-cyan-accent/30">
            Don't just read the claim. Run it.
          </p>
        </div>

      </div>

      {/* Forensic metadata (static decoration) */}
      <div className="absolute bottom-4 left-4 text-[9px] font-mono text-cyan-accent/40 text-left leading-tight hidden md:block">
        RC_VER: 2.1.0<br/>
        SYS_OP: VERIFY_OK<br/>
        ENV: SECURE
      </div>
      <div className="absolute bottom-4 right-4 text-[9px] font-mono text-cyan-accent/40 text-right leading-tight hidden md:block">
        LAT: {Math.random().toFixed(4)}<br/>
        LNG: {Math.random().toFixed(4)}<br/>
        SYNC: T-0.00
      </div>
    </div>
  );
}
