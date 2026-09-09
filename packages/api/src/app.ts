import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health';
import { runRoutes } from './routes/runs';
import { RealityCheckOrchestrator } from '@realitycheck/orchestrator';
import { ExperimentRepository } from '@realitycheck/db';
import { ClaimCompiler } from '@realitycheck/contracts';

export interface AppDependencies {
  orchestrator: RealityCheckOrchestrator;
  repository: ExperimentRepository;
  compiler: ClaimCompiler;
}

export function buildApp(deps?: AppDependencies): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS']
  });

  if (deps) {
    app.decorate('orchestrator', deps.orchestrator);
    app.decorate('repository', deps.repository);
    app.decorate('compiler', deps.compiler);
  }

  app.register(healthRoutes);
  
  if (deps) {
    app.register(runRoutes, { prefix: '/api/runs' });
  }

  return app;
}
