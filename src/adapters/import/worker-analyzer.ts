import type { ProjectAnalyzer } from '../../application/ports/project-analyzer';
import type { WorkerRequest, WorkerResponse } from './analyze-worker';

const cancelled = () => new DOMException('Import cancelled', 'AbortError');

export function createWorkerAnalyzer(): ProjectAnalyzer {
  return (files, _newId, options = {}) =>
    new Promise((resolve, reject) => {
      if (options.signal?.aborted) {
        reject(cancelled());
        return;
      }
      const worker = new Worker(new URL('./analyze-worker.ts', import.meta.url), {
        type: 'module',
      });
      const settle = (finish: () => void) => {
        options.signal?.removeEventListener('abort', onAbort);
        worker.terminate();
        finish();
      };
      const onAbort = () => {
        settle(() => {
          reject(cancelled());
        });
      };
      options.signal?.addEventListener('abort', onAbort);
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        settle(() => {
          if (response.type === 'result') resolve(response.result);
          else reject(new Error(response.message));
        });
      };
      worker.onerror = () => {
        settle(() => {
          reject(new Error('The analysis worker crashed.'));
        });
      };
      const request: WorkerRequest =
        options.maxFiles === undefined ? { files } : { files, maxFiles: options.maxFiles };
      worker.postMessage(request);
    });
}
