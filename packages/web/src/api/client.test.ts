import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from './client';

describe('apiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('createRun calls POST /api/runs with correct body', async () => {
    const mockRun = { id: 'test-run-123', status: 'NOT_RUN' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRun,
    });

    const result = await apiClient.createRun('test claim', 'https://example.com', 'CONTROLLED');
    
    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:3001/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: 'test claim', url: 'https://example.com', executionMode: 'CONTROLLED' })
    });
    expect(result).toEqual(mockRun);
  });

  it('throws ApiError on failed request', async () => {
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request' }),
    });

    await expect(apiClient.createRun('test', 'https://invalid', 'CONTROLLED')).rejects.toThrow(ApiError);
  });
});
