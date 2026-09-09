import React from 'react';
import type { ExecutionStatus } from '../api/types';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface RunStatusViewerProps {
  status: ExecutionStatus;
}

export const RunStatusViewer: React.FC<RunStatusViewerProps> = ({ status }) => {
  const config = {
    NOT_RUN: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Not Run' },
    RUNNING: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Running' },
    COMPLETED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
    FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  }[status] || { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100', label: status || 'Unknown' };

  const Icon = config.icon;

  return (
    <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-transparent', config.bg, config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </div>
  );
};
