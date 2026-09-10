import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../../../.env') });

import { buildApp } from './app';
import { RealityCheckOrchestrator } from '@realitycheck/orchestrator';
import { ExperimentRepository, createDatabase } from '@realitycheck/db';
import { GroqClaimCompiler } from '@realitycheck/compiler';
import Database from 'better-sqlite3';
import {
  AdapterRegistry,
  GenericAdaptiveAdapter
} from '@realitycheck/browser';

AdapterRegistry.register(new GenericAdaptiveAdapter());

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '3001', 10);
const DB_PATH = process.env.DB_PATH || 'local.db';

const dbClient = new Database(DB_PATH);
const repository = new ExperimentRepository(createDatabase(dbClient));
const orchestrator = new RealityCheckOrchestrator(repository);
const compiler = new GroqClaimCompiler();

const app = buildApp({ orchestrator, repository, compiler });

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
