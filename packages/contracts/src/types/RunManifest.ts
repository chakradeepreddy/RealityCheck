import { ExecutionMode } from '../schemas/experiment';
import { ExperimentSpec } from '../schemas/experiment';

export interface RunManifest {
  schemaVersion: '1.0.0';
  runId: string;
  claim: string;
  targetUrl: string;
  originalRunId?: string;
  
  primitive: 'BOUNDARY' | 'CANARY';
  executionMode: ExecutionMode;
  
  adapter: string;
  adapterVersion: string;
  
  experimentSpec: ExperimentSpec;
  
  browserEnvironment: {
    browser: 'Chromium';
    version: string;
    viewport: { width: number; height: number };
    locale: string;
    currency: string;
    region: string;
  };
  
  testConditions: {
    authorizationContext?: string; // Representation of auth state if needed
  };
  
  startedAt: string; // ISO 8601 DateTime string
  
  expectedObservables: ExperimentSpec['expectedObservables'];
}
