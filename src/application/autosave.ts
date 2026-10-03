import type { DiagramStore } from './diagram-store';
import type { DiagramRepository } from './ports/diagram-repository';

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

export function startAutosave(
  store: DiagramStore,
  repository: DiagramRepository,
  delayMs = AUTOSAVE_DELAY_MS,
): Autosave {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<boolean> | undefined;
  let suspended = false;
  // True from the first unsaved change until a write of the latest diagram succeeds.
  // A failed write leaves it set, so the next flush retries.
  let dirty = false;

  const hasUnsavedChanges = () => dirty;

  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const write = async (): Promise<boolean> => {
    const { diagram, setSaveStatus } = store.getState();
    // Cleared before the write: a change made during it sets the flag again.
    dirty = false;
    try {
      await repository.save(diagram);
    } catch {
      // The diagram is still in memory; the UI tells the user to export it.
      dirty = true;
      setSaveStatus('failed');
      return false;
    }
    // TypeScript cannot see that a change during the await set the flag again.
    if (!hasUnsavedChanges()) store.getState().setSaveStatus('saved');
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
    dirty = true;
    if (!suspended) schedule();
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
      if (dirty) schedule();
    },
    stop: () => {
      clearTimer();
      unsubscribe();
    },
  };
}
