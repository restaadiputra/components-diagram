import { removeItem } from '../../application/commands/remove-item';
import { updateItem, type ItemPatch } from '../../application/commands/update-item';
import type { DiagramNode, Item } from '../../domain/diagram';
import { useServices } from '../app-shell/services-context';
import { CommitInput } from './commit-input';
import { LinksEditor } from './links-editor';
import { TraceSteps } from './trace-steps';

export function ItemInspector({ node, item }: { node: DiagramNode; item: Item }) {
  const { store } = useServices();
  const apply = store.getState().apply;
  const target = { nodeId: node.id, itemId: item.id };
  const update = (patch: ItemPatch) =>
    apply((diagram) => updateItem(diagram, { ...target, patch }));
  const field = (name: string, value: string) => `${item.id}:${name}:${value}`;

  return (
    <>
      <h3 className="mb-2 font-semibold">
        {node.name} · {item.kind}
      </h3>
      <CommitInput
        key={field('name', item.name)}
        label="Name"
        value={item.name}
        onCommit={(name) => update({ name })}
      />
      <CommitInput
        key={field('type', item.type ?? '')}
        label="Type (optional)"
        value={item.type ?? ''}
        onCommit={(type) => update({ type })}
      />
      <CommitInput
        key={field('note', item.note ?? '')}
        label="Note (optional)"
        value={item.note ?? ''}
        onCommit={(note) => update({ note })}
      />
      <LinksEditor key={item.id} node={node} item={item} />
      <TraceSteps />
      <button
        className="rounded border border-red-300 px-2 py-0.5 text-red-700"
        onClick={() => apply((diagram) => removeItem(diagram, target))}
      >
        Delete item
      </button>
    </>
  );
}
