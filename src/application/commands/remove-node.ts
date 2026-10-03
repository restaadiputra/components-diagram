import { findNode, type Diagram } from '../../domain/diagram';

export function removeNode(diagram: Diagram, nodeId: string): Diagram {
  if (!findNode(diagram, nodeId)) return diagram;
  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => node.id !== nodeId),
    edges: diagram.edges.filter(
      (edge) => edge.source.nodeId !== nodeId && edge.target.nodeId !== nodeId,
    ),
  };
}
