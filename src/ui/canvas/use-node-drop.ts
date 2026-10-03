import type { DragEvent } from 'react';
import { parseNodeKind } from '../../domain/diagram';
import { useAddNode } from './use-add-node';

export const NODE_KIND_MIME = 'application/x-node-kind';

export function useNodeDrop() {
  const addNode = useAddNode();
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const kind = parseNodeKind(event.dataTransfer.getData(NODE_KIND_MIME));
    if (kind !== undefined) addNode(kind, { x: event.clientX, y: event.clientY });
  };
  return { onDragOver, onDrop };
}
