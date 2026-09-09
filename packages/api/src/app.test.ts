import { describe, it, expect } from 'vitest';
import { buildApp } from './app';

describe('Fastify API', () => {
  it('should return HTTP 200 and { status: "ok" } on GET /health', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });

  it('can be instantiated without opening a TCP port', () => {
    const app = buildApp();
    expect(app).toBeDefined();
  });
});
