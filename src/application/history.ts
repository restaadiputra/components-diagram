import type { Diagram } from '../domain/diagram';

export interface History {
  past: Diagram[];
  future: Diagram[];
}

export const HISTORY_LIMIT = 100;

export const emptyHistory: History = { past: [], future: [] };

/** A new change makes the redo branch unreachable, so it is discarded. */
export function record(history: History, previous: Diagram): History {
  return { past: [...history.past, previous].slice(-HISTORY_LIMIT), future: [] };
}

export interface HistoryStep {
  diagram: Diagram;
  history: History;
}

export function stepBack(history: History, current: Diagram): HistoryStep | undefined {
  const previous = history.past.at(-1);
  if (previous === undefined) return undefined;
  return {
    diagram: previous,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
  };
}

export function stepForward(history: History, current: Diagram): HistoryStep | undefined {
  const [next, ...rest] = history.future;
  if (next === undefined) return undefined;
  return { diagram: next, history: { past: [...history.past, current], future: rest } };
}
