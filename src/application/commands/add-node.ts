import type { Diagram, NodeKind, Position } from '../../domain/diagram';
import { isNodeIdUsed } from '../../domain/id-usage';

export interface AddNodeInput {
  id: string;
  kind: NodeKind;
  name: string;
  position: Position;
}

export function addNode(diagram: Diagram, input: AddNodeInput): Diagram {
  if (isNodeIdUsed(diagram, input.id)) return diagram;
  const node = { ...input, collapsed: false, items: [], links: [] };
  return { ...diagram, nodes: [...diagram.nodes, node] };
}
