export const ExecutionStatusEnum = {
  NOT_RUN: 'NOT_RUN',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  UNSUPPORTED_SITE: 'UNSUPPORTED_SITE',
  NOT_TESTABLE: 'NOT_TESTABLE'
} as const;

export type ExecutionStatus = typeof ExecutionStatusEnum[keyof typeof ExecutionStatusEnum];
