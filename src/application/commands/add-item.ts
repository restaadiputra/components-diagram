import type { Diagram, Item } from '../../domain/diagram';
import { isItemIdUsed } from '../../domain/id-usage';
import { allowsItem } from '../../domain/node-kinds';
import { updateNode } from './update-node';

export function addItem(diagram: Diagram, input: { nodeId: string; item: Item }): Diagram {
  const name = input.item.name.trim();
  if (name === '' || isItemIdUsed(diagram, input.item.id)) return diagram;
  return updateNode(diagram, input.nodeId, (node) =>
    allowsItem(node.kind, input.item.kind)
      ? { ...node, items: [...node.items, { ...input.item, name }] }
      : node,
  );
}
