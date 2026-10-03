import type { Diagram } from '../../domain/diagram';
import { updateNode } from './update-node';

export function toggleCollapsed(diagram: Diagram, nodeId: string): Diagram {
  return updateNode(diagram, nodeId, (node) => ({ ...node, collapsed: !node.collapsed }));
}
