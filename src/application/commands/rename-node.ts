import type { Diagram } from '../../domain/diagram';
import { updateNode } from './update-node';

export function renameNode(diagram: Diagram, input: { nodeId: string; name: string }): Diagram {
  const name = input.name.trim();
  if (name === '') return diagram;
  return updateNode(diagram, input.nodeId, (node) =>
    node.name === name ? node : { ...node, name },
  );
}
