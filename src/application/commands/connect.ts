import { canConnect, type ConnectionCandidate } from '../../domain/connection-rules';
import type { Diagram } from '../../domain/diagram';

export type ConnectInput = ConnectionCandidate & { id: string };

export function connect(diagram: Diagram, input: ConnectInput): Diagram {
  if (!canConnect(diagram, input)) return diagram;
  const { id, kind, source, target } = input;
  return { ...diagram, edges: [...diagram.edges, { id, kind, source, target }] };
}
