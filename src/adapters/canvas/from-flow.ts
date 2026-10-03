import { validEdgeKinds } from '../../domain/connection-rules';
import type { Diagram, Endpoint } from '../../domain/diagram';
import { toEndpoint } from './handle-ids';

export interface FlowConnection {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export function endpointsOf(connection: FlowConnection): { source: Endpoint; target: Endpoint } {
  return {
    source: toEndpoint(connection.source, connection.sourceHandle),
    target: toEndpoint(connection.target, connection.targetHandle),
  };
}

/** Where a connection drag started, and whether that end is its source or its target. */
export interface DragOrigin {
  endpoint: Endpoint;
  side: 'source' | 'target';
}

export function isInvalidTarget(
  diagram: Diagram,
  origin: DragOrigin,
  candidate: Endpoint,
): boolean {
  const kinds =
    origin.side === 'source'
      ? validEdgeKinds(diagram, origin.endpoint, candidate)
      : validEdgeKinds(diagram, candidate, origin.endpoint);
  return kinds.length === 0;
}
