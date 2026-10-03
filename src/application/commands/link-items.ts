import type { Diagram, DiagramNode, InternalLink } from '../../domain/diagram';
import { updateNode } from './update-node';

function canLink(node: DiagramNode, link: InternalLink): boolean {
  if (link.fromItemId === link.toItemId) return false;
  const ids = node.items.map((item) => item.id);
  if (!ids.includes(link.fromItemId) || !ids.includes(link.toItemId)) return false;
  return !node.links.some(
    (existing) =>
      existing.fromItemId === link.fromItemId &&
      existing.toItemId === link.toItemId &&
      existing.relation === link.relation,
  );
}

export function linkItems(
  diagram: Diagram,
  input: { nodeId: string; link: InternalLink },
): Diagram {
  return updateNode(diagram, input.nodeId, (node) =>
    canLink(node, input.link) ? { ...node, links: [...node.links, input.link] } : node,
  );
}
