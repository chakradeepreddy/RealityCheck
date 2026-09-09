import React from 'react';
import { Verdict } from '../api/types';
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
      color: 'text-emerald-700', 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200',
      label: 'SUPPORTED' 
    },
    CONTRADICTED: { 
      icon: XOctagon, 
      color: 'text-rose-700', 
      bg: 'bg-rose-50', 
      border: 'border-rose-200',
      label: 'CONTRADICTED' 
    },
    INCONCLUSIVE: { 
      icon: HelpCircle, 
      color: 'text-amber-700', 
      bg: 'bg-amber-50', 
      border: 'border-amber-200',
      label: 'INCONCLUSIVE' 
    },
  }[verdict];

  const Icon = config.icon;

  return (
    <div className={clsx('p-6 rounded-xl border-2 mb-6 shadow-sm', config.bg, config.border)}>
      <div className="flex items-start gap-4">
        <Icon className={clsx('w-8 h-8 mt-1 flex-shrink-0', config.color)} />
        <div>
          <h2 className={clsx('text-2xl font-bold tracking-tight mb-2', config.color)}>
            {config.label}
          </h2>
          {reason && (
            <p className="text-slate-700 text-lg leading-relaxed">
              {reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
