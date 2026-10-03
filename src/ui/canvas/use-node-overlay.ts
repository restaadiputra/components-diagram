import type { OnNodeDrag, OnNodesChange } from '@xyflow/react';
import { useCallback, useState } from 'react';
import {
  applyOverlayChanges,
  clearPositions,
  emptyOverlay,
} from '../../adapters/canvas/node-overlay';
import type { DiagramFlowNode } from '../../adapters/canvas/to-flow';
import { moveNode } from '../../application/commands/move-node';
import { useServices } from '../app-shell/services-context';

export function useNodeOverlay() {
  const { store } = useServices();
  const [overlay, setOverlay] = useState(emptyOverlay);

  const onNodesChange = useCallback<OnNodesChange<DiagramFlowNode>>((changes) => {
    setOverlay((current) => applyOverlayChanges(current, changes));
  }, []);

  // One undo step per drag, however many nodes moved.
  const onNodeDragStop = useCallback<OnNodeDrag<DiagramFlowNode>>(
    (_event, _node, dragged) => {
      store
        .getState()
        .apply((diagram) =>
          dragged.reduce(
            (current, node) => moveNode(current, { nodeId: node.id, position: node.position }),
            diagram,
          ),
        );
      setOverlay((current) =>
        clearPositions(
          current,
          dragged.map((node) => node.id),
        ),
      );
    },
    [store],
  );

  return { overlay, onNodesChange, onNodeDragStop };
}
