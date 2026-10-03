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
  /** True when the diagram is open but could not be stored yet, so no record exists. */
  unsaved?: boolean;
}

/** What the stored record must look like for a conditional save to go ahead. */
export interface SaveExpectation {
  /** The `updatedAt` of the stored record, or null when no record may exist yet. */
  updatedAt: string | null;
}

/** The stored record changed or vanished since it was last read; nothing was written. */
export class SaveConflictError extends Error {
  constructor() {
    super('The diagram was changed elsewhere, so it was not saved.');
    this.name = 'SaveConflictError';
  }
}

export interface DiagramRepository {
  /**
   * Without `expected` the write is unconditional. With it, the write happens only if the
   * stored record still matches; otherwise it rejects with SaveConflictError.
   */
  save: (diagram: Diagram, expected?: SaveExpectation) => Promise<void>;
  /** Resolves to undefined when there is no such diagram; rejects when it is unreadable. */
  load: (id: string) => Promise<LoadedDiagram | undefined>;
  /** Newest first. */
  list: () => Promise<DiagramSummary[]>;
  delete: (id: string) => Promise<void>;
}
