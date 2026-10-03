import { useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import type { DiagramFlowNode } from '../../adapters/canvas/to-flow';
import { NODE_KINDS } from '../../domain/node-kinds';
import { useDiagramState } from '../app-shell/services-context';
import { AddItemForm } from './add-item-form';
import { ItemSections } from './item-sections';
import { NodeHeader } from './node-header';

export function DiagramNodeView({ data, selected }: NodeProps<DiagramFlowNode>) {
  const { node } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const traceResult = useDiagramState((state) => state.traceResult);

  // Handles appear and disappear with items and collapsing; React Flow must re-read them.
  useEffect(() => {
    updateNodeInternals(node.id);
  }, [updateNodeInternals, node.id, node.items.length, node.collapsed]);

  // A node with no item on the traced path fades out as a whole.
  const outsideTrace =
    traceResult !== null && !node.items.some((item) => traceResult.itemIds.includes(item.id));

  return (
    <div
      data-testid={`node-${node.name}`}
      className={`min-w-52 rounded-md border-2 bg-white text-xs shadow-sm ${selected ? 'ring-2 ring-sky-400' : ''} ${outsideTrace ? 'opacity-30' : ''}`}
      style={{ borderColor: NODE_KINDS[node.kind].color }}
    >
      <NodeHeader node={node} />
      {!node.collapsed && <ItemSections node={node} />}
      {!node.collapsed && <AddItemForm node={node} />}
    </div>
  );
}
