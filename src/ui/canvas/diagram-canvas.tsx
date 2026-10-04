import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState } from 'react';
import { toFlowEdges, toFlowNodes } from '../../adapters/canvas/to-flow';
import { useDiagramState, useServices } from '../app-shell/services-context';
import { DiagramNodeView } from './diagram-node';
import { EdgeLegend } from './edge-legend';
import { FitOnLoad } from './fit-on-load';
import { EdgeKindMenu } from './edge-kind-menu';
import { QuickAddMenu } from './quick-add-menu';
import { useAddNode } from './use-add-node';
import { useConnect } from './use-connect';
import { useNodeDrop } from './use-node-drop';
import { useEscape } from './use-escape';
import { useNodeOverlay } from './use-node-overlay';

// Defined once: a new object on every render would remount every node.
const nodeTypes = { diagram: DiagramNodeView };

function isPane(target: EventTarget): boolean {
  return target instanceof Element && target.classList.contains('react-flow__pane');
}

export function DiagramCanvas() {
  const { store } = useServices();
  const diagram = useDiagramState((state) => state.diagram);
  const selection = useDiagramState((state) => state.selection);
  const traceResult = useDiagramState((state) => state.traceResult);
  const { overlay, onNodesChange } = useNodeOverlay();
  const connection = useConnect();
  const drop = useNodeDrop();
  const addNode = useAddNode();
  const [quickAdd, setQuickAdd] = useState<{ x: number; y: number } | null>(null);

  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);
  useEscape(quickAdd !== null, closeQuickAdd);

  const view = useMemo(
    () => ({ selection, traceResult, overlay }),
    [selection, traceResult, overlay],
  );
  const nodes = useMemo(() => toFlowNodes(diagram, view), [diagram, view]);
  const edges = useMemo(() => toFlowEdges(diagram, view), [diagram, view]);
  const { select, setViewport } = store.getState();
  // A saved viewport wins; only a never-moved diagram is fitted to its content.
  const { x, y, zoom } = diagram.viewport;
  const unmoved = x === 0 && y === 0 && zoom === 1;

  return (
    <div
      className="relative h-full w-full"
      onDragOver={drop.onDragOver}
      onDrop={drop.onDrop}
      onDoubleClick={(event) => {
        if (isPane(event.target)) setQuickAdd({ x: event.clientX, y: event.clientY });
      }}
    >
      <ReactFlow
        // A different diagram gets a fresh canvas, so its saved viewport applies.
        key={diagram.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={diagram.viewport}
        onMoveEnd={(_event, viewport) => setViewport(viewport)}
        onNodesChange={onNodesChange}
        onConnect={connection.onConnect}
        isValidConnection={connection.isValidConnection}
        onNodeClick={(_event, node) => select({ type: 'node', nodeId: node.id })}
        onEdgeClick={(_event, edge) => select({ type: 'edge', edgeId: edge.id })}
        onPaneClick={() => {
          select(null);
          setQuickAdd(null);
          connection.cancel();
        }}
        // Deleting goes through commands (see use-shortcuts), not React Flow.
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.1}
      >
        <FitOnLoad enabled={unmoved && diagram.nodes.length > 0} />
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
      <EdgeLegend />
      {connection.pending && (
        <EdgeKindMenu
          kinds={connection.pending.kinds}
          onChoose={connection.choose}
          onCancel={connection.cancel}
        />
      )}
      {quickAdd && (
        <QuickAddMenu
          at={quickAdd}
          onChoose={(kind) => {
            addNode(kind, quickAdd);
            setQuickAdd(null);
          }}
        />
      )}
    </div>
  );
}
