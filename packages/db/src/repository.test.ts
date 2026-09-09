import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, ExperimentRepository } from './repository';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { RunManifest, ExperimentSpec, VerdictEnum, ExecutionStatusEnum } from '@realitycheck/contracts';
import { observations, runs } from './schema';
import { eq } from 'drizzle-orm';

describe('ExperimentRepository', () => {
  let sqlite: ReturnType<typeof Database>;
  let repo: ExperimentRepository;

  beforeEach(() => {
    // In-memory SQLite for tests
    sqlite = new Database(':memory:');
    const db = createDatabase(sqlite);
    
    // We need to create tables manually since we aren't running drizzle-kit migrate in unit tests
    // A quick workaround to create tables for the test without actual migration files:
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "runs" (
        "id" text PRIMARY KEY NOT NULL,
        "original_run_id" text,
        "schema_version" text NOT NULL,
        "claim" text NOT NULL,
        "target_url" text NOT NULL,
        "primitive" text NOT NULL,
        "execution_mode" text NOT NULL,
        "adapter" text NOT NULL,
        "adapter_version" text NOT NULL,
        "started_at" text NOT NULL,
        "completed_at" text,
        "status" text NOT NULL,
        "verdict" text NOT NULL,
        "verdict_reason" text,
        "claimed_boundary" real,
        "observed_boundary" real,
        "browser_environment" text NOT NULL,
        "test_conditions" text NOT NULL,
        "experiment_spec" text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "observations" (
        "id" text PRIMARY KEY NOT NULL,
        "run_id" text NOT NULL,
        "schema_version" text NOT NULL,
        "sequence_index" integer NOT NULL,
        "timestamp" text NOT NULL,
        "url" text NOT NULL,
        "browser_conditions" text,
        "page_state" text,
        "dom_observations" text,
        "canary_markers" text,
        "evidence_refs" text,
        FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON UPDATE no action ON DELETE cascade
      );
    `);

    repo = new ExperimentRepository(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('saves and retrieves a run correctly', async () => {
    const spec: ExperimentSpec = {
      schemaVersion: '1.0.0',
      primitive: 'BOUNDARY',
      boundaryType: 'NUMERIC_THRESHOLD',
      targetUrl: 'https://example.com',
      testConditions: { cartSubtotalTarget: 999 },
      expectedObservables: { shippingCost: 0 }
    };

    const manifest: RunManifest = {
      schemaVersion: '1.0.0',
      runId: 'run-123',
      claim: 'Free shipping over 999',
      targetUrl: 'https://example.com',
      primitive: 'BOUNDARY',
      executionMode: 'CONTROLLED',
      adapter: 'mock-adapter',
      adapterVersion: '1.0',
      experimentSpec: spec,
      browserEnvironment: {
        browser: 'Chromium',
        version: '100',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        currency: 'USD',
        region: 'US'
      },
      testConditions: {},
      startedAt: new Date().toISOString(),
      expectedObservables: spec.expectedObservables
    };

    await repo.saveRun(manifest, ExecutionStatusEnum.COMPLETED, VerdictEnum.SUPPORTED, undefined, 999, 999);
    await repo.saveObservations('run-123', [
      {
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        url: 'https://example.com',
        pageState: { cartSubtotal: 999, shippingCost: 0 }
      }
    ]);

    const retrieved = await repo.getRun('run-123');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('run-123');
    expect(retrieved?.verdict).toBe('SUPPORTED');
    expect(retrieved?.claimedBoundary).toBe(999);
    
    expect(retrieved?.observations).toBeDefined();
    expect(retrieved?.observations.length).toBe(1);
    
    // Parse JSON
    const parsedSpec = JSON.parse(retrieved!.experimentSpec) as ExperimentSpec;
    expect(parsedSpec.primitive).toBe('BOUNDARY');
    expect(parsedSpec.testConditions.cartSubtotalTarget).toBe(999);
    
    const parsedPageState = JSON.parse(retrieved!.observations[0].pageState!);
    expect(parsedPageState.cartSubtotal).toBe(999);
  });
});
