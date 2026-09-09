import { ExecutionMode, Run } from './types';

// @ts-ignore
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

export class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(`API Error: ${status}`);
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw new ApiError(response.status, errorData);
  }

  return response.json();
}

export const apiClient = {
  async createRun(claim: string, url: string, executionMode: ExecutionMode = 'CONTROLLED'): Promise<Run> {
    return fetchApi<Run>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({ claim, url, executionMode }),
    });
  },

  async getRun(runId: string): Promise<Run> {
    return fetchApi<Run>(`/api/runs/${runId}`);
  },

  async replayRun(runId: string, executionMode: ExecutionMode = 'CONTROLLED'): Promise<Run> {
    return fetchApi<Run>(`/api/runs/${runId}/replay`, {
      method: 'POST',
      body: JSON.stringify({ executionMode }),
    });
  }
};
