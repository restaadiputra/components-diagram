import type { Diagram } from '../../domain/diagram';
import { updateNode } from './update-node';

export function unlinkItems(diagram: Diagram, input: { nodeId: string; linkId: string }): Diagram {
  return updateNode(diagram, input.nodeId, (node) => {
    const links = node.links.filter((link) => link.id !== input.linkId);
    return links.length === node.links.length ? node : { ...node, links };
  });
}
