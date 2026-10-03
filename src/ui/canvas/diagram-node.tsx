import { useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import type { DiagramFlowNode } from '../../adapters/canvas/to-flow';
import { NODE_KINDS } from '../../domain/node-kinds';
import { NodeHeader } from './node-header';

export function DiagramNodeView({ data, selected }: NodeProps<DiagramFlowNode>) {
  const { node } = data;
  const updateNodeInternals = useUpdateNodeInternals();

  // Handles appear and disappear with items and collapsing; React Flow must re-read them.
  useEffect(() => {
    updateNodeInternals(node.id);
  }, [updateNodeInternals, node.id, node.items.length, node.collapsed]);

  return (
    <div
      data-testid={`node-${node.name}`}
      className={`min-w-52 rounded-md border-2 bg-white text-xs shadow-sm ${selected ? 'ring-2 ring-sky-400' : ''}`}
      style={{ borderColor: NODE_KINDS[node.kind].color }}
    >
      <NodeHeader node={node} />
    </div>
  );
}
