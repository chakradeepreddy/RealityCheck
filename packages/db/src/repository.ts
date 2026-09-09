import { Database } from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { eq, asc } from 'drizzle-orm';
import { ExperimentSpec, Observation, RunManifest, Verdict, ExecutionStatus } from '@realitycheck/contracts';

export type RealityCheckDB = BetterSQLite3Database<typeof schema>;

export function createDatabase(client: Database): RealityCheckDB {
  return drizzle(client, { schema });
}

export class ExperimentRepository {
  constructor(private db: RealityCheckDB) {}

  async saveRun(
    manifest: RunManifest, 
    status: ExecutionStatus,
    verdict: Verdict, 
    verdictReason?: string, 
    claimedBoundary?: number, 
    observedBoundary?: number
  ): Promise<void> {
    await this.db.insert(schema.runs).values({
      id: manifest.runId,
      originalRunId: manifest.originalRunId || null,
      schemaVersion: manifest.schemaVersion,
      claim: manifest.claim,
      targetUrl: manifest.targetUrl,
      primitive: manifest.primitive,
      executionMode: manifest.executionMode,
      adapter: manifest.adapter,
      adapterVersion: manifest.adapterVersion,
      startedAt: manifest.startedAt,
      completedAt: new Date().toISOString(),
      status,
      verdict,
      verdictReason: verdictReason || null,
      claimedBoundary: claimedBoundary ?? null,
      observedBoundary: observedBoundary ?? null,
      browserEnvironment: JSON.stringify(manifest.browserEnvironment),
      testConditions: JSON.stringify(manifest.testConditions),
      experimentSpec: JSON.stringify(manifest.experimentSpec)
    });
  }

  async saveObservations(runId: string, observations: Observation[]): Promise<void> {
    if (observations.length === 0) return;

    const values = observations.map((obs, index) => ({
      id: crypto.randomUUID(),
      runId,
      schemaVersion: obs.schemaVersion,
      sequenceIndex: index,
      timestamp: obs.timestamp,
      url: obs.url,
      browserConditions: obs.browserConditions ? JSON.stringify(obs.browserConditions) : null,
      pageState: obs.pageState ? JSON.stringify(obs.pageState) : null,
      domObservations: obs.domObservations ? JSON.stringify(obs.domObservations) : null,
      canaryMarkers: obs.canaryMarkers ? JSON.stringify(obs.canaryMarkers) : null,
      evidenceRefs: obs.evidenceRefs ? JSON.stringify(obs.evidenceRefs) : null
    }));

    await this.db.insert(schema.observations).values(values);
  }

  async getRun(runId: string) {
    const run = await this.db.query.runs.findFirst({
      where: eq(schema.runs.id, runId),
      with: {
        observations: {
          orderBy: [asc(schema.observations.sequenceIndex)]
        }
      }
    });
    return run;
  }
}
