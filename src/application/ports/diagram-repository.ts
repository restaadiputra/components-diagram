import type { Diagram } from '../../domain/diagram';

export interface DiagramSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface LoadedDiagram {
  diagram: Diagram;
  /** Nodes, items, edges and links that were invalid and removed on load. */
  droppedReferences: number;
}

export interface DiagramRepository {
  save: (diagram: Diagram) => Promise<void>;
  /** Resolves to undefined when there is no such diagram; rejects when it is unreadable. */
  load: (id: string) => Promise<LoadedDiagram | undefined>;
  /** Newest first. */
  list: () => Promise<DiagramSummary[]>;
  delete: (id: string) => Promise<void>;
}
