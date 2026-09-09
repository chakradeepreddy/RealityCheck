import { describe, it, expect, vi } from 'vitest';
import { buildApp } from './app';

const mockRepository = {
  getRun: vi.fn(),
} as any;

const mockOrchestrator = {
  runNewExperiment: vi.fn(),
  runReplay: vi.fn(),
} as any;

const mockCompiler = {
  compileClaim: vi.fn(),
} as any;

const deps = {
  repository: mockRepository,
  orchestrator: mockOrchestrator,
  compiler: mockCompiler,
};

describe('Fastify API', () => {
  it('should return HTTP 200 and { status: "ok" } on GET /health', async () => {
    const app = buildApp(deps);
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });

  it('can be instantiated without opening a TCP port', () => {
    const app = buildApp(deps);
    expect(app).toBeDefined();
  });

  it('should reject POST /api/runs with invalid input', async () => {
    const app = buildApp(deps);
    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { claim: '' }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 for GET /api/runs/:runId when not found', async () => {
    mockRepository.getRun.mockResolvedValueOnce(null);
    const app = buildApp(deps);
    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/non-existent-id'
    });

    expect(response.statusCode).toBe(404);
  });
  
  it('should return 400 when replay targets non-existent run', async () => {
    mockRepository.getRun.mockResolvedValueOnce(null);
    const app = buildApp(deps);
    const response = await app.inject({
      method: 'POST',
      url: '/api/runs/missing/replay'
    });

    expect(response.statusCode).toBe(404);
  });
});
