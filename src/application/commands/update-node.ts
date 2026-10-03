import type { Diagram, DiagramNode } from '../../domain/diagram';

/** Replaces one node. Returns the same diagram when nothing changed. */
export function updateNode(
  diagram: Diagram,
  nodeId: string,
  change: (node: DiagramNode) => DiagramNode,
): Diagram {
  const index = diagram.nodes.findIndex((node) => node.id === nodeId);
  const current = diagram.nodes[index];
  if (!current) return diagram;
  const next = change(current);
  if (next === current) return diagram;
  return { ...diagram, nodes: diagram.nodes.map((node, i) => (i === index ? next : node)) };
}
