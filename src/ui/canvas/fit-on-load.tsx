import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Fits a diagram that opens never-moved and with nodes, once React Flow has measured
 * them: fitting earlier works from unmeasured sizes and lands at the wrong zoom. Only the
 * state at mount counts, so adding the first node to a blank diagram never moves the view.
 */
export function FitOnLoad({ enabled }: { enabled: boolean }) {
  // Lazy state keeps the value from the first render, which a prop read in an effect would not.
  const [wanted] = useState(enabled);
  const measured = useNodesInitialized();
  const { fitView } = useReactFlow();
  const done = useRef(false);

  useEffect(() => {
    if (!wanted || !measured || done.current) return;
    done.current = true;
    void fitView({ padding: 0.15, maxZoom: 1 });
  }, [wanted, measured, fitView]);

  return null;
}
