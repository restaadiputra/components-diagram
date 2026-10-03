import type { Diagram } from '../../domain/diagram';
import type { Selection } from '../selection';
import { removeEdge } from './remove-edge';
import { removeItem } from './remove-item';
import { removeNode } from './remove-node';

export function removeSelection(diagram: Diagram, selection: Selection): Diagram {
  if (selection === null) return diagram;
  if (selection.type === 'node') return removeNode(diagram, selection.nodeId);
  if (selection.type === 'edge') return removeEdge(diagram, selection.edgeId);
  return removeItem(diagram, { nodeId: selection.nodeId, itemId: selection.itemId });
}
