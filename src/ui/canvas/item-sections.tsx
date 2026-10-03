import type { DiagramNode } from '../../domain/diagram';
import { ITEM_KIND_LABELS, NODE_KINDS } from '../../domain/node-kinds';
import { ItemRow } from './item-row';

/** Items grouped by kind, in the registry's order. Empty sections are not shown. */
export function ItemSections({ node }: { node: DiagramNode }) {
  return (
    <>
      {NODE_KINDS[node.kind].itemKinds.map((kind) => {
        const items = node.items.filter((item) => item.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind}>
            <h4 className="px-3 pt-1 text-[10px] uppercase tracking-wide text-slate-400">
              {ITEM_KIND_LABELS[kind]}
            </h4>
            {items.map((item) => (
              <ItemRow key={item.id} node={node} item={item} />
            ))}
          </section>
        );
      })}
    </>
  );
}
