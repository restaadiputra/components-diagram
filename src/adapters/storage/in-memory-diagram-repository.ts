import type { DiagramRepository } from '../../application/ports/diagram-repository';
import type { Diagram } from '../../domain/diagram';
import { repairDiagram } from '../../domain/repair';
import { newestFirst } from './diagram-schema';

/** Used in tests, and as the fallback when the browser has no usable IndexedDB. */
export function createInMemoryDiagramRepository(): DiagramRepository {
  const records = new Map<string, Diagram>();
  return {
    save: (diagram) => {
      records.set(diagram.id, structuredClone(diagram));
      return Promise.resolve();
    },
    load: (id) => {
      const found = records.get(id);
      if (!found) return Promise.resolve(undefined);
      const { diagram, dropped } = repairDiagram(structuredClone(found));
      return Promise.resolve({ diagram, droppedReferences: dropped });
    },
    list: () => {
      const summaries = [...records.values()].map(({ id, name, updatedAt }) => ({
        id,
        name,
        updatedAt,
      }));
      return Promise.resolve(summaries.sort(newestFirst));
    },
    delete: (id) => {
      records.delete(id);
      return Promise.resolve();
    },
  };
}
