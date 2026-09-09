import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExperimentForm } from '../components/ExperimentForm';
import { apiClient } from '../api/client';
import type { ExecutionMode } from '../api/types';

export function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRunNewExperiment = async (url: string, claim: string, mode: ExecutionMode, attachment?: File) => {
    setIsLoading(true);
    setError(null);

    try {
      let attachmentPath;
      if (attachment) {
        const uploadRes = await apiClient.uploadAttachment(attachment);
        attachmentPath = uploadRes.attachmentPath;
      }

      const run = await apiClient.createRun(claim, url, mode, attachmentPath);
      navigate(`/runs/${run.id}`);
    } catch (err: any) {
      setError(err.data?.error || err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <ExperimentForm onSubmit={handleRunNewExperiment} isLoading={isLoading} />
      </section>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <h3 className="text-red-800 font-medium">Execution Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
