import React from 'react';
import type { ExecutionStatus } from '../api/types';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface RunStatusViewerProps {
  status: ExecutionStatus;
}

export const RunStatusViewer: React.FC<RunStatusViewerProps> = ({ status }) => {
  const config = {
    NOT_RUN: { icon: Clock, color: 'text-slate-muted', bg: 'bg-navy-bg border-navy-border', label: 'Not Run' },
    RUNNING: { icon: Activity, color: 'text-cyan-accent', bg: 'bg-cyan-accent/10 border-cyan-accent/30', label: 'Running' },
    COMPLETED: { icon: CheckCircle, color: 'text-verdict-supported', bg: 'bg-verdict-supported/10 border-verdict-supported/30', label: 'Completed' },
    FAILED: { icon: XCircle, color: 'text-verdict-contradicted', bg: 'bg-verdict-contradicted/10 border-verdict-contradicted/30', label: 'Failed' },
    UNSUPPORTED_SITE: { icon: XCircle, color: 'text-verdict-inconclusive', bg: 'bg-verdict-inconclusive/10 border-verdict-inconclusive/30', label: 'Unsupported Site' },
    NOT_TESTABLE: { icon: XCircle, color: 'text-verdict-inconclusive', bg: 'bg-verdict-inconclusive/10 border-verdict-inconclusive/30', label: 'Not Testable' },
  }[status] || { icon: Activity, color: 'text-slate-muted', bg: 'bg-navy-bg border-navy-border', label: status || 'Unknown' };

  const Icon = config.icon;

  return (
    <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-transparent', config.bg, config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </div>
  );
};
