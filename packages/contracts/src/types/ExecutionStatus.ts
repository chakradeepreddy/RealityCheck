export const ExecutionStatusEnum = {
  NOT_RUN: 'NOT_RUN',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

export type ExecutionStatus = typeof ExecutionStatusEnum[keyof typeof ExecutionStatusEnum];
