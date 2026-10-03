import type { Diagram, NodeKind, Position } from '../../domain/diagram';

export interface AddNodeInput {
  id: string;
  kind: NodeKind;
  name: string;
  position: Position;
}

export function addNode(diagram: Diagram, input: AddNodeInput): Diagram {
  const node = { ...input, collapsed: false, items: [], links: [] };
  return { ...diagram, nodes: [...diagram.nodes, node] };
}
