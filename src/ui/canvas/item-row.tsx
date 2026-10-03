import { Handle, Position } from '@xyflow/react';
import { handleId } from '../../adapters/canvas/handle-ids';
import type { DiagramNode, Item } from '../../domain/diagram';
import { useDiagramState, useServices } from '../app-shell/services-context';
import { useInvalidTarget } from './use-invalid-target';

export function ItemRow({ node, item }: { node: DiagramNode; item: Item }) {
  const { store } = useServices();
  const selection = useDiagramState((state) => state.selection);
  const traceResult = useDiagramState((state) => state.traceResult);
  const invalid = useInvalidTarget({ nodeId: node.id, itemId: item.id });

  const active = selection?.type === 'item' && selection.itemId === item.id;
  const outsideTrace = traceResult !== null && !traceResult.itemIds.includes(item.id);

  return (
    <div
      data-testid={`item-${node.name}-${item.name}`}
      className={`relative flex cursor-pointer justify-between gap-3 px-3 py-0.5 hover:bg-slate-100 ${active ? 'bg-sky-100' : ''} ${invalid || outsideTrace ? 'opacity-30' : ''}`}
      onClick={(event) => {
        // Selecting the row must not also select the node around it.
        event.stopPropagation();
        store.getState().select({ type: 'item', nodeId: node.id, itemId: item.id });
      }}
    >
      <Handle type="target" position={Position.Left} id={handleId('in', item.id)} />
      <span>{item.name}</span>
      {item.type && <span className="text-slate-400">{item.type}</span>}
      <Handle type="source" position={Position.Right} id={handleId('out', item.id)} />
    </div>
  );
}
