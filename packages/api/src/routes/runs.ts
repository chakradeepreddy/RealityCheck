import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AdapterRegistry } from '@realitycheck/browser';
import { ClaimCompiler } from '@realitycheck/contracts';
import { RealityCheckOrchestrator } from '@realitycheck/orchestrator';
import { ExperimentRepository } from '@realitycheck/db';

const CreateRunSchema = z.object({
  claim: z.string().min(1),
  url: z.string().url(),
  executionMode: z.enum(['CONTROLLED', 'AUTHORIZED_LIVE']).optional().default('CONTROLLED')
});

const ReplayRunSchema = z.object({
  executionMode: z.enum(['CONTROLLED', 'AUTHORIZED_LIVE']).optional().default('CONTROLLED')
});

export async function runRoutes(app: FastifyInstance) {
  // @ts-ignore
  const orchestrator = app.orchestrator as RealityCheckOrchestrator;
  // @ts-ignore
  const compiler = app.compiler as ClaimCompiler;
  // @ts-ignore
  const repository = app.repository as ExperimentRepository;

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CreateRunSchema.parse(request.body);
      const adapter = AdapterRegistry.resolve(body.url);
      
      const result = await orchestrator.runNewExperiment(
        body.claim,
        body.url,
        adapter,
        compiler,
        body.executionMode
      );
      
      return reply.code(201).send(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.issues });
      }
      if (error.message.includes('No registered SiteAdapter')) {
        return reply.code(400).send({ error: error.message });
      }
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  app.get('/:runId', async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
    try {
      const runId = request.params.runId;
      const run = await repository.getRun(runId);
      
      if (!run) {
        return reply.code(404).send({ error: 'Run not found' });
      }
      
      return reply.send({
        id: run.id,
        originalRunId: run.originalRunId,
        claim: run.claim,
        targetUrl: run.targetUrl,
        primitive: run.primitive,
        executionMode: run.executionMode,
        status: run.status,
        verdict: run.verdict,
        verdictReason: run.verdictReason,
        claimedBoundary: run.claimedBoundary,
        observedBoundary: run.observedBoundary,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        schemaVersion: run.schemaVersion,
        adapter: run.adapter,
        adapterVersion: run.adapterVersion,
        observations: run.observations?.map((obs: any) => ({
          sequenceIndex: obs.sequenceIndex,
          timestamp: obs.timestamp,
          url: obs.url,
          browserConditions: obs.browserConditions ? JSON.parse(obs.browserConditions) : null,
          pageState: obs.pageState ? JSON.parse(obs.pageState) : null,
          domObservations: obs.domObservations ? JSON.parse(obs.domObservations) : null,
          canaryMarkers: obs.canaryMarkers ? JSON.parse(obs.canaryMarkers) : null,
          evidenceRefs: obs.evidenceRefs ? JSON.parse(obs.evidenceRefs) : null
        }))
      });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  app.post('/:runId/replay', async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
    try {
      const runId = request.params.runId;
      const body = ReplayRunSchema.parse(request.body || {});
      
      const originalRun = await repository.getRun(runId);
      if (!originalRun) {
        return reply.code(404).send({ error: 'Original run not found' });
      }
      
      const adapter = AdapterRegistry.resolve(originalRun.targetUrl);
      
      const result = await orchestrator.runReplay(
        runId,
        adapter,
        body.executionMode
      );
      
      return reply.code(201).send(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.issues });
      }
      if (error.message.includes('No registered SiteAdapter')) {
        return reply.code(400).send({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });
}
