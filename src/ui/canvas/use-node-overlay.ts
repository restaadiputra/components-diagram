import type { OnNodesChange } from '@xyflow/react';
import { useCallback, useState } from 'react';
import {
  applyOverlayChanges,
  clearPositions,
  committedMoves,
  emptyOverlay,
} from '../../adapters/canvas/node-overlay';
import type { DiagramFlowNode } from '../../adapters/canvas/to-flow';
import { moveNode } from '../../application/commands/move-node';
import { useServices } from '../app-shell/services-context';

export function useNodeOverlay() {
  const { store } = useServices();
  const [overlay, setOverlay] = useState(emptyOverlay);

  const onNodesChange = useCallback<OnNodesChange<DiagramFlowNode>>(
    (changes) => {
      // Drag end and keyboard nudges arrive together as one change batch, so
      // one undo step covers however many nodes moved.
      const moves = committedMoves(changes);
      if (moves.length > 0) {
        store
          .getState()
          .apply((diagram) => moves.reduce((current, move) => moveNode(current, move), diagram));
      }
      const committedIds = moves.map((move) => move.nodeId);
      setOverlay((current) => clearPositions(applyOverlayChanges(current, changes), committedIds));
    },
    [store],
  );

  return { overlay, onNodesChange };
}
