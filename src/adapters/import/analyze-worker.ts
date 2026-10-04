import type { ImportResult, SourceFiles } from '../../application/ports/project-analyzer';
import { analyzeProject } from './analyze-project';

export interface WorkerRequest {
  files: SourceFiles;
  maxFiles?: number;
}
export type WorkerResponse =
  { type: 'result'; result: ImportResult } | { type: 'error'; message: string };

// A worker has no DOM `postMessage(targetOrigin)`; this is the worker-scope signature.
const scope = self as unknown as { postMessage: (message: WorkerResponse) => void };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { files, maxFiles } = event.data;
  // The worker is its own composition point: functions cannot cross the thread boundary.
  analyzeProject(files, () => crypto.randomUUID(), maxFiles === undefined ? {} : { maxFiles }).then(
    (result) => {
      scope.postMessage({ type: 'result', result });
    },
    (error: unknown) => {
      scope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'analysis failed',
      });
    },
  );
};
