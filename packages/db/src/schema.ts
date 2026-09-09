import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  originalRunId: text('original_run_id'),
  schemaVersion: text('schema_version').notNull(),
  claim: text('claim').notNull(),
  targetUrl: text('target_url').notNull(),
  primitive: text('primitive').notNull(),
  executionMode: text('execution_mode').notNull(),
  adapter: text('adapter').notNull(),
  adapterVersion: text('adapter_version').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  status: text('status').notNull(),
  verdict: text('verdict').notNull(),
  verdictReason: text('verdict_reason'),
  claimedBoundary: real('claimed_boundary'),
  observedBoundary: real('observed_boundary'),
  browserEnvironment: text('browser_environment').notNull(), // JSON
  testConditions: text('test_conditions').notNull(), // JSON
  experimentSpec: text('experiment_spec').notNull() // JSON
});

export const observations = sqliteTable('observations', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  schemaVersion: text('schema_version').notNull(),
  sequenceIndex: integer('sequence_index').notNull(),
  timestamp: text('timestamp').notNull(),
  url: text('url').notNull(),
  browserConditions: text('browser_conditions'), // JSON
  pageState: text('page_state'), // JSON
  domObservations: text('dom_observations'), // JSON
  canaryMarkers: text('canary_markers'), // JSON
  evidenceRefs: text('evidence_refs') // JSON
});

import { relations } from 'drizzle-orm';

export const runsRelations = relations(runs, ({ many }) => ({
  observations: many(observations),
}));

export const observationsRelations = relations(observations, ({ one }) => ({
  run: one(runs, {
    fields: [observations.runId],
    references: [runs.id],
  }),
}));
