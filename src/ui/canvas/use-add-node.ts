import { useReactFlow } from '@xyflow/react';
import { addNode } from '../../application/commands/add-node';
import type { NodeKind } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';
import { useServices } from '../app-shell/services-context';

/** Adds a node at a point given in screen (client) coordinates. */
export function useAddNode() {
  const { store, newId } = useServices();
  const { screenToFlowPosition } = useReactFlow();
  return (kind: NodeKind, screen: { x: number; y: number }) => {
    const position = screenToFlowPosition(screen);
    const name = NODE_KINDS[kind].defaultName;
    store.getState().apply((diagram) => addNode(diagram, { id: newId(), kind, name, position }));
  };
}
