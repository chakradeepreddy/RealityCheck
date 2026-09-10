import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health';
import { runRoutes } from './routes/runs';
import { attachmentRoutes } from './routes/attachments';
import { RealityCheckOrchestrator } from '@realitycheck/orchestrator';
import { ExperimentRepository } from '@realitycheck/db';
import { ClaimCompiler } from '@realitycheck/contracts';

export interface AppDependencies {
  orchestrator: RealityCheckOrchestrator;
  repository: ExperimentRepository;
  compiler: ClaimCompiler;
}

import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

export function buildApp(deps?: AppDependencies): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'data', 'evidence'),
    prefix: '/evidence/',
    decorateReply: false
  });

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];
      if (allowedOrigins.some((regex) => regex.test(origin))) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
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

  app.register(attachmentRoutes, { prefix: '/api/attachments' });

  return app;
}
