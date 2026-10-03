import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { findNode, type Diagram, type DiagramNode, type Endpoint } from '../../domain/diagram';
import { EDGE_KINDS, type EdgeKindSpec } from '../../domain/edge-kinds';
import type { TraceResult } from '../../domain/trace';
import type { Selection } from '../../application/selection';
import { handleId } from './handle-ids';
import type { NodeOverlay } from './node-overlay';

export type DiagramFlowNode = Node<{ node: DiagramNode }, 'diagram'>;

export interface CanvasView {
  selection: Selection;
  traceResult: TraceResult | null;
  overlay: NodeOverlay;
}

export const DASH_ARRAY: Record<EdgeKindSpec['dash'], string | undefined> = {
  solid: undefined,
  dashed: '6 4',
  dotted: '2 4',
};

const DIMMED_OPACITY = 0.15;

export function toFlowNodes(diagram: Diagram, view: CanvasView): DiagramFlowNode[] {
  return diagram.nodes.map((node) => {
    const measured = view.overlay.measured[node.id];
    return {
      id: node.id,
      type: 'diagram',
      position: view.overlay.positions[node.id] ?? node.position,
      data: { node },
      selected: view.selection?.type === 'node' && view.selection.nodeId === node.id,
      ...(measured ? { measured } : {}),
    };
  });
}

/** A collapsed node has no item rows, so its edges attach to the header. */
function handleFor(diagram: Diagram, endpoint: Endpoint, side: 'in' | 'out'): string {
  const collapsed = findNode(diagram, endpoint.nodeId)?.collapsed ?? false;
  return handleId(side, collapsed ? undefined : endpoint.itemId);
}

export function toFlowEdges(diagram: Diagram, view: CanvasView): Edge[] {
  return diagram.edges.map((edge) => {
    const spec = EDGE_KINDS[edge.kind];
    const dimmed = view.traceResult !== null && !view.traceResult.edgeIds.includes(edge.id);
    return {
      id: edge.id,
      source: edge.source.nodeId,
      target: edge.target.nodeId,
      sourceHandle: handleFor(diagram, edge.source, 'out'),
      targetHandle: handleFor(diagram, edge.target, 'in'),
      selected: view.selection?.type === 'edge' && view.selection.edgeId === edge.id,
      markerEnd: { type: MarkerType.ArrowClosed, color: spec.color },
      style: {
        stroke: spec.color,
        strokeWidth: 2,
        strokeDasharray: DASH_ARRAY[spec.dash],
        opacity: dimmed ? DIMMED_OPACITY : 1,
      },
    };
  });
}
