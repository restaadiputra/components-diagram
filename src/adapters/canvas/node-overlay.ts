import type { NodeChange } from '@xyflow/react';
import type { Position } from '../../domain/diagram';
import type { DiagramFlowNode } from './to-flow';

/**
 * What React Flow knows and the domain does not: where a node is while it is
 * being dragged, and how big it rendered. React Flow hides a node until it has
 * a measured size, so the size must be fed back on every render.
 */
export interface NodeOverlay {
  positions: Record<string, Position>;
  measured: Record<string, { width: number; height: number }>;
}

export const emptyOverlay: NodeOverlay = { positions: {}, measured: {} };

export function applyOverlayChanges(
  overlay: NodeOverlay,
  changes: NodeChange<DiagramFlowNode>[],
): NodeOverlay {
  return changes.reduce<NodeOverlay>((current, change) => {
    if (change.type === 'position' && change.position) {
      return { ...current, positions: { ...current.positions, [change.id]: change.position } };
    }
    if (change.type === 'dimensions' && change.dimensions) {
      return { ...current, measured: { ...current.measured, [change.id]: change.dimensions } };
    }
    return current;
  }, overlay);
}

export function clearPositions(overlay: NodeOverlay, nodeIds: string[]): NodeOverlay {
  const kept = Object.entries(overlay.positions).filter(([id]) => !nodeIds.includes(id));
  return { ...overlay, positions: Object.fromEntries(kept) };
}
