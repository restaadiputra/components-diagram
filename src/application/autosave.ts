import type { DiagramStore } from './diagram-store';
import { createSaveBaseline } from './save-baseline';
import type { Diagram } from '../domain/diagram';
import {
  SaveConflictError,
  type DiagramRepository,
  type SaveExpectation,
} from './ports/diagram-repository';

export const AUTOSAVE_DELAY_MS = 800;

export interface Autosave {
  /** Waits for a running save, saves if a change is pending. Resolves true only when nothing is left unsaved. */
  flush: () => Promise<boolean>;
  /** Stops reacting to changes, drops a pending save, and waits for a running one. */
  suspend: () => Promise<void>;
  /** Starts reacting to changes again. */
  resume: () => void;
  stop: () => void;
}

export interface AutosaveOptions {
  delayMs?: number;
  /** The stored `updatedAt` of the open diagram; null if it is not stored yet. Defaults to its own. */
  baseline?: string | null;
}

/** Resolves to null when the write succeeded, else the status to show. */
async function trySave(
  repository: DiagramRepository,
  diagram: Diagram,
  expected: SaveExpectation,
): Promise<'conflict' | 'failed' | null> {
  try {
    await repository.save(diagram, expected);
    return null;
  } catch (error) {
    return error instanceof SaveConflictError ? 'conflict' : 'failed';
  }
}

export function startAutosave(
  store: DiagramStore,
  repository: DiagramRepository,
  { delayMs = AUTOSAVE_DELAY_MS, baseline: initialBaseline }: AutosaveOptions = {},
): Autosave {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<boolean> | undefined;
  let suspended = false;
  const hasUnsavedChanges = () => dirty;
  // True from the first unsaved change until a write of the latest diagram succeeds.
  // A failed write leaves it set, so the next flush retries.
  let dirty = false;

  const baseline = createSaveBaseline(store.getState().diagram, initialBaseline);
  // Once another tab changed the diagram this tab never writes it again; it must be reloaded.
  let conflicted = false;

  const clearTimer = () => {
    clearTimeout(timer);
  };

  const write = async (): Promise<boolean> => {
    const { diagram, setSaveStatus } = store.getState();
    dirty = false; // a change made during the write sets it again
    const failure = await trySave(repository, diagram, baseline.expectation());
    if (failure) {
      // The diagram is still in memory; the UI tells the user to export it.
      dirty = true;
      conflicted = failure === 'conflict';
      setSaveStatus(failure);
      return false;
    }
    baseline.wrote(diagram, store.getState().diagram);
    // TypeScript cannot see that a change during the await set the flag again.
    if (!hasUnsavedChanges()) setSaveStatus('saved');
    return true;
  };

  // Writes never overlap: callers wait for `running` before starting the next one.
  const startWrite = (): Promise<boolean> => {
    const current = write().finally(() => {
      if (running === current) running = undefined;
    });
    running = current;
    return current;
  };

  const flush = async (): Promise<boolean> => {
    clearTimer();
    if (suspended) {
      // The open diagram may be mid-delete: writing it would bring it back.
      while (running) await running;
      return !hasUnsavedChanges();
    }
    for (;;) {
      while (running) await running;
      if (!dirty) return true;
      if (conflicted) return false;
      if (!(await startWrite())) return false;
    }
  };

  const schedule = () => {
    clearTimer();
    store.getState().setSaveStatus('saving');
    timer = setTimeout(() => void flush(), delayMs);
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.diagram === previous.diagram) return;
    if (state.diagram.id !== previous.diagram.id) {
      baseline.opened(state.diagram);
      conflicted = false;
    }
    dirty = true;
    if (!suspended && !conflicted) schedule();
  });

  return {
    flush,
    suspend: async () => {
      suspended = true;
      clearTimer();
      while (running) await running;
    },
    resume: () => {
      suspended = false;
      // A change that was dropped or made while suspended is still unsaved.
      if (dirty && !conflicted) schedule();
    },
    stop: () => {
      clearTimer();
      unsubscribe();
    },
  };
}
