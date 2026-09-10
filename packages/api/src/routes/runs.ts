import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AdapterRegistry } from '@realitycheck/browser';
import { ClaimCompiler } from '@realitycheck/contracts';
import { RealityCheckOrchestrator } from '@realitycheck/orchestrator';
import { ExperimentRepository } from '@realitycheck/db';
import fs from 'fs/promises';
import path from 'path';
const CreateRunSchema = z.object({
  claim: z.string().min(1),
  claimAttachmentPath: z.string().optional(),
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
  // @ts-ignore
  const repository = app.repository as ExperimentRepository;

  const formatRunResponse = (run: any) => ({
    id: run.id,
    originalRunId: run.originalRunId,
    claim: run.claim,
    claimAttachmentPath: run.claimAttachmentPath,
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

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CreateRunSchema.parse(request.body);
      
      let adapter = null;
      try {
        adapter = AdapterRegistry.resolve(body.url);
      } catch (err: any) {
        // Adapter not found, pass null so Orchestrator logs UNSUPPORTED_SITE
      }
      
      const result = await orchestrator.runNewExperiment(
        body.claim,
        body.url,
        adapter,
        compiler,
        body.executionMode,
        body.claimAttachmentPath
      ) as any;
      
      console.log('Orchestrator result:', { runId: result.runId, spec: !!result.spec });

      const run = await repository.getRun(result.runId);
      if (!run) {
        return reply.code(500).send({ error: 'Failed to retrieve created run' });
      }
      
      return reply.code(201).send(formatRunResponse(run));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.issues });
      }
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const runs = await repository.getAllRuns();
      return reply.send(runs.map(formatRunResponse));
    } catch (error: any) {
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
      
      return reply.send(formatRunResponse(run));
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
      const run = await repository.getRun(result.runId);
      if (!run) {
        return reply.code(500).send({ error: 'Failed to retrieve replayed run' });
      }
      
      return reply.code(201).send(formatRunResponse(run));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.issues });
      }
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  app.delete('/:runId', async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
    try {
      const runId = request.params.runId;
      const existing = await repository.getRun(runId);
      if (!existing) {
        return reply.code(404).send({ error: 'Run not found' });
      }

      // Delete associated evidence files
      const evidenceDir = path.join(process.cwd(), 'data', 'evidence');
      
      const deleteFile = async (filename: string) => {
        try {
          await fs.unlink(path.join(evidenceDir, filename));
        } catch (e: any) {
          if (e.code !== 'ENOENT') {
            app.log.warn(`Failed to delete evidence file ${filename}: ${e.message}`);
          }
        }
      };

      if (existing.claimAttachmentPath) {
        await deleteFile(existing.claimAttachmentPath);
      }

      if (existing.observations) {
        for (const obs of existing.observations) {
          if (obs.evidenceRefs) {
            try {
              const refs = JSON.parse(obs.evidenceRefs);
              if (refs.screenshotPath) {
                await deleteFile(refs.screenshotPath);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      await repository.deleteRun(runId);
      return reply.code(204).send();
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });
}
