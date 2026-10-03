import { useState } from 'react';
import { addItem } from '../../application/commands/add-item';
import type { DiagramNode, ItemKind } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';
import { useServices } from '../app-shell/services-context';

export function AddItemForm({ node }: { node: DiagramNode }) {
  const { store, newId } = useServices();
  const kinds = NODE_KINDS[node.kind].itemKinds;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ItemKind | undefined>(kinds[0]);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button
        className="nodrag w-full px-3 py-1 text-left text-slate-400 hover:text-slate-700"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        + add item
      </button>
    );
  }

  const submit = () => {
    if (kind === undefined || name.trim() === '') return;
    const item = { id: newId(), kind, name };
    store.getState().apply((diagram) => addItem(diagram, { nodeId: node.id, item }));
    setName('');
  };

  return (
    <form
      className="nodrag flex gap-1 p-2"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <select
        aria-label="Item kind"
        className="rounded border"
        value={kind}
        onChange={(event) => setKind(kinds.find((option) => option === event.target.value))}
      >
        {kinds.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        aria-label="Item name"
        autoFocus
        className="w-24 rounded border px-1"
        placeholder="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      />
    </form>
  );
}
