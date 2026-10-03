import { findItem, findNode, type Diagram } from '../domain/diagram';
import { trace, type TraceResult } from '../domain/trace';

export type Selection =
  | { type: 'node'; nodeId: string }
  | { type: 'item'; nodeId: string; itemId: string }
  | { type: 'edge'; edgeId: string }
  | null;

export interface SelectionView {
  selection: Selection;
  traceResult: TraceResult | null;
}

const NOTHING: SelectionView = { selection: null, traceResult: null };

function exists(diagram: Diagram, selection: NonNullable<Selection>): boolean {
  if (selection.type === 'edge') return diagram.edges.some((edge) => edge.id === selection.edgeId);
  if (selection.type === 'node') return findNode(diagram, selection.nodeId) !== undefined;
  return findItem(diagram, selection) !== undefined;
}

/** Re-validates a selection against a diagram and derives its trace. */
export function reselect(diagram: Diagram, selection: Selection): SelectionView {
  if (selection === null || !exists(diagram, selection)) return NOTHING;
  const traceResult = selection.type === 'item' ? trace(diagram, selection.itemId) : null;
  return { selection, traceResult };
}
