import type { Diagram } from '../domain/diagram';
import type { SaveExpectation } from './ports/diagram-repository';

/**
 * The `updatedAt` this tab last read or wrote for the open diagram. A save only goes
 * through while the stored record still has it, so another tab's work is never replaced.
 */
export interface SaveBaseline {
  expectation: () => SaveExpectation;
  /** Another diagram was opened: its stored `updatedAt` is the new baseline. */
  opened: (diagram: Diagram) => void;
  /** A write succeeded. Ignored when a different diagram was opened during the write. */
  wrote: (written: Diagram, open: Diagram) => void;
}

/** `initial` defaults to the open diagram's own `updatedAt`; null means it is not stored yet. */
export function createSaveBaseline(open: Diagram, initial?: string | null): SaveBaseline {
  let updatedAt = initial === undefined ? open.updatedAt : initial;
  return {
    expectation: () => ({ updatedAt }),
    opened: (diagram) => {
      updatedAt = diagram.updatedAt;
    },
    wrote: (written, open) => {
      if (open.id === written.id) updatedAt = written.updatedAt;
    },
  };
}
