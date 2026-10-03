import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Diagram, Viewport } from '../domain/diagram';
import type { TraceResult } from '../domain/trace';
import {
  emptyHistory,
  record,
  stepBack,
  stepForward,
  type History,
  type HistoryStep,
} from './history';
import { reselect, type Selection } from './selection';

export type Command = (diagram: Diagram) => Diagram;
export type SaveStatus = 'saved' | 'saving' | 'failed';

export interface DiagramState {
  diagram: Diagram;
  history: History;
  /** View state: never part of the diagram, never saved. */
  selection: Selection;
  traceResult: TraceResult | null;
  saveStatus: SaveStatus;
  notice: string | null;
  apply: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  select: (selection: Selection) => void;
  setViewport: (viewport: Viewport) => void;
  load: (diagram: Diagram) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setNotice: (notice: string | null) => void;
}

export type DiagramStore = StoreApi<DiagramState>;

export function createDiagramStore(initial: Diagram, now: () => string): DiagramStore {
  return createStore<DiagramState>()((set, get) => {
    // Panning is not an edit, so stepping through history keeps the current view.
    const travel = (step: HistoryStep | undefined) => {
      if (!step) return;
      const diagram = { ...step.diagram, viewport: get().diagram.viewport };
      set({ diagram, history: step.history, ...reselect(diagram, get().selection) });
    };

    return {
      diagram: initial,
      history: emptyHistory,
      selection: null,
      traceResult: null,
      saveStatus: 'saved',
      notice: null,
      apply: (command) => {
        const { diagram, history, selection } = get();
        const changed = command(diagram);
        if (changed === diagram) return;
        const next = { ...changed, updatedAt: now() };
        set({ diagram: next, history: record(history, diagram), ...reselect(next, selection) });
      },
      undo: () => travel(stepBack(get().history, get().diagram)),
      redo: () => travel(stepForward(get().history, get().diagram)),
      select: (selection) => set(reselect(get().diagram, selection)),
      setViewport: (viewport) => set({ diagram: { ...get().diagram, viewport } }),
      load: (diagram) =>
        set({ diagram, history: emptyHistory, selection: null, traceResult: null }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      setNotice: (notice) => set({ notice }),
    };
  });
}
