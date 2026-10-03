import { useState } from 'react';
import { linkItems } from '../../application/commands/link-items';
import { unlinkItems } from '../../application/commands/unlink-items';
import {
  LINK_RELATION_VALUES,
  type DiagramNode,
  type Item,
  type LinkRelation,
} from '../../domain/diagram';
import { useServices } from '../app-shell/services-context';

/** Edits what one item reads, sets or depends on inside its own node. */
export function LinksEditor({ node, item }: { node: DiagramNode; item: Item }) {
  const { store, newId } = useServices();
  const apply = store.getState().apply;
  const others = node.items.filter((other) => other.id !== item.id);
  const [relation, setRelation] = useState<LinkRelation>('reads');
  const [targetId, setTargetId] = useState('');

  const nameOf = (id: string) => node.items.find((other) => other.id === id)?.name ?? 'unknown';
  const add = () => {
    if (targetId === '') return;
    const link = { id: newId(), fromItemId: item.id, toItemId: targetId, relation };
    apply((diagram) => linkItems(diagram, { nodeId: node.id, link }));
  };

  return (
    <section className="mb-3">
      <h4 className="mb-1 text-xs uppercase text-slate-400">Inside {node.name}</h4>
      <ul aria-label="Links">
        {node.links
          .filter((link) => link.fromItemId === item.id)
          .map((link) => (
            <li key={link.id} className="flex justify-between">
              <span>
                {link.relation} {nameOf(link.toItemId)}
              </span>
              <button
                aria-label={`Remove link to ${nameOf(link.toItemId)}`}
                onClick={() =>
                  apply((diagram) => unlinkItems(diagram, { nodeId: node.id, linkId: link.id }))
                }
              >
                ✕
              </button>
            </li>
          ))}
      </ul>
      <div className="mt-1 flex gap-1">
        <select
          aria-label="Relation"
          className="rounded border"
          value={relation}
          onChange={(event) =>
            setRelation(LINK_RELATION_VALUES.find((v) => v === event.target.value) ?? 'reads')
          }
        >
          {LINK_RELATION_VALUES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Linked item"
          className="min-w-0 flex-1 rounded border"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          <option value="">choose…</option>
          {others.map((other) => (
            <option key={other.id} value={other.id}>
              {other.name}
            </option>
          ))}
        </select>
        <button className="rounded border px-2" onClick={add}>
          Add
        </button>
      </div>
    </section>
  );
}
