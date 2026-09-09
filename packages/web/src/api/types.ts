export type Primitive = 'BOUNDARY' | 'CANARY';
export type ExecutionMode = 'CONTROLLED' | 'AUTHORIZED_LIVE';
export type ExecutionStatus = 'NOT_RUN' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type Verdict = 'SUPPORTED' | 'CONTRADICTED' | 'INCONCLUSIVE';

export interface Observation {
  sequenceIndex: number;
  timestamp: string;
  url: string;
  browserConditions?: Record<string, any>;
  pageState?: Record<string, any>;
  domObservations?: Record<string, string>;
  canaryMarkers?: string[];
  evidenceRefs?: Record<string, string>;
}

export interface Run {
  id: string;
  originalRunId?: string;
  claim: string;
  claimAttachmentPath?: string;
  targetUrl: string;
  primitive: Primitive;
  executionMode: ExecutionMode;
  status: ExecutionStatus;
  verdict?: Verdict;
  verdictReason?: string;
  claimedBoundary?: number;
  observedBoundary?: number;
  startedAt: string;
  completedAt?: string;
  schemaVersion: string;
  adapter: string;
  adapterVersion: string;
  observations?: Observation[];
}
