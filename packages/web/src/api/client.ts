import type { ExecutionMode, Run } from './types';

import { API_BASE_URL } from '../config';

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
  async uploadAttachment(file: File): Promise<{ attachmentPath: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/attachments`, {
      method: 'POST',
      body: formData,
      // Do not set Content-Type, browser will automatically set it to multipart/form-data with boundary
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
  },

  async createRun(claim: string, url: string, executionMode: ExecutionMode = 'CONTROLLED', claimAttachmentPath?: string): Promise<Run> {
    return fetchApi<Run>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({ claim, url, executionMode, claimAttachmentPath }),
    });
  },

  async getRun(runId: string): Promise<Run> {
    return fetchApi<Run>(`/api/runs/${runId}`);
  },

  async getAllRuns(): Promise<Run[]> {
    return fetchApi<Run[]>('/api/runs');
  },

  async replayRun(runId: string, executionMode: ExecutionMode = 'CONTROLLED'): Promise<Run> {
    return fetchApi<Run>(`/api/runs/${runId}/replay`, {
      method: 'POST',
      body: JSON.stringify({ executionMode }),
    });
  }
};
