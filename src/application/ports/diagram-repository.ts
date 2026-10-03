import type { Diagram } from '../../domain/diagram';

export interface DiagramSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface LoadedDiagram {
  diagram: Diagram;
  /** Edges and links that pointed at something missing and were removed. */
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
