import type { Diagram, Position } from '../../domain/diagram';
import { updateNode } from './update-node';

export function moveNode(diagram: Diagram, input: { nodeId: string; position: Position }): Diagram {
  const { x, y } = input.position;
  return updateNode(diagram, input.nodeId, (node) =>
    node.position.x === x && node.position.y === y ? node : { ...node, position: { x, y } },
  );
}
