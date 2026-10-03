import type { Diagram } from '../../domain/diagram';
import { updateNode } from './update-node';

export function removeItem(diagram: Diagram, input: { nodeId: string; itemId: string }): Diagram {
  const { nodeId, itemId } = input;
  const pruned = updateNode(diagram, nodeId, (node) => {
    if (!node.items.some((item) => item.id === itemId)) return node;
    return {
      ...node,
      items: node.items.filter((item) => item.id !== itemId),
      links: node.links.filter((link) => link.fromItemId !== itemId && link.toItemId !== itemId),
    };
  });
  if (pruned === diagram) return diagram;
  const edges = pruned.edges.filter(
    (edge) => edge.source.itemId !== itemId && edge.target.itemId !== itemId,
  );
  return { ...pruned, edges };
}
