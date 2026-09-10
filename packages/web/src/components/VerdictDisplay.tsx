import React from 'react';
import type { Verdict } from '../api/types';
import { CheckCircle2, XOctagon, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface VerdictDisplayProps {
  verdict?: Verdict;
  reason?: string;
}

export const VerdictDisplay: React.FC<VerdictDisplayProps> = ({ verdict, reason }) => {
  if (!verdict) return null;

  const config = {
    SUPPORTED: { 
      icon: CheckCircle2, 
      color: 'text-verdict-supported', 
      bg: 'bg-verdict-supported/10', 
      border: 'border-verdict-supported/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]',
      label: 'SUPPORTED' 
    },
    CONTRADICTED: { 
      icon: XOctagon, 
      color: 'text-verdict-contradicted', 
      bg: 'bg-verdict-contradicted/10', 
      border: 'border-verdict-contradicted/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      label: 'CONTRADICTED' 
    },
    INCONCLUSIVE: { 
      icon: HelpCircle, 
      color: 'text-verdict-inconclusive', 
      bg: 'bg-verdict-inconclusive/10', 
      border: 'border-verdict-inconclusive/30 shadow-[0_0_20px_rgba(148,163,184,0.15)]',
      label: 'INCONCLUSIVE' 
    },
  }[verdict] || {
    icon: HelpCircle,
    color: 'text-slate-muted',
    bg: 'bg-navy-bg',
    border: 'border-navy-border',
    label: verdict || 'UNKNOWN'
  };

  const Icon = config.icon;

  return (
    <div className={clsx('p-6 rounded-xl border mb-6', config.bg, config.border)}>
      <div className="flex items-start gap-4">
        <Icon className={clsx('w-8 h-8 mt-1 flex-shrink-0', config.color)} />
        <div>
          <h2 className={clsx('text-2xl font-black tracking-tight mb-2 text-glow', config.color)}>
            {config.label}
          </h2>
          {reason && (
            <p className="text-off-white font-medium text-lg leading-relaxed">
              {reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
