import { canConnect, type ConnectionCandidate } from '../../domain/connection-rules';
import type { Diagram } from '../../domain/diagram';
import { isEdgeIdUsed } from '../../domain/id-usage';

export type ConnectInput = ConnectionCandidate & { id: string };

export function connect(diagram: Diagram, input: ConnectInput): Diagram {
  if (isEdgeIdUsed(diagram, input.id) || !canConnect(diagram, input)) return diagram;
  const { id, kind, source, target } = input;
  return { ...diagram, edges: [...diagram.edges, { id, kind, source, target }] };
}
