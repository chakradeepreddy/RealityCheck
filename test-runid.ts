import { RealityCheckOrchestrator } from './packages/orchestrator/src/RealityCheckOrchestrator';
import { ExperimentRepository } from './packages/db/src/repository';
import { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
// ... too much boilerplate to test orchestrator

console.log("I'll just log inside the API.");
