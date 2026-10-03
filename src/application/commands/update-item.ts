import type { Diagram, Item } from '../../domain/diagram';
import { updateNode } from './update-node';

export interface ItemPatch {
  name?: string;
  type?: string;
  note?: string;
}

export interface UpdateItemInput {
  nodeId: string;
  itemId: string;
  patch: ItemPatch;
}

/** Optional fields are absent rather than empty, so saved files stay minimal. */
function withoutEmptyFields(item: Item): Item {
  const { type, note, ...rest } = item;
  return { ...rest, ...(type ? { type } : {}), ...(note ? { note } : {}) };
}

/** A missing optional field and an empty one mean the same thing once stripped. */
function sameContent(a: Item, b: Item): boolean {
  return (
    a.name === b.name && (a.type ?? '') === (b.type ?? '') && (a.note ?? '') === (b.note ?? '')
  );
}

export function updateItem(diagram: Diagram, input: UpdateItemInput): Diagram {
  const name = input.patch.name?.trim();
  if (name === '') return diagram;
  const patch = name === undefined ? input.patch : { ...input.patch, name };
  return updateNode(diagram, input.nodeId, (node) => {
    const existing = node.items.find((item) => item.id === input.itemId);
    if (!existing) return node;
    const updated = withoutEmptyFields({ ...existing, ...patch });
    if (sameContent(existing, updated)) return node;
    return { ...node, items: node.items.map((item) => (item === existing ? updated : item)) };
  });
}
