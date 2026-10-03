import type { ReactNode } from 'react';
import type { Selection } from '../../application/selection';
import { findNode, type Diagram } from '../../domain/diagram';
import { useDiagramState } from '../app-shell/services-context';
import { EdgeInspector } from './edge-inspector';
import { ItemInspector } from './item-inspector';
import { NodeInspector } from './node-inspector';

function content(diagram: Diagram, selection: Selection): ReactNode {
  if (selection === null) {
    return <p className="text-slate-400">Select a node, an item or an edge.</p>;
  }
  if (selection.type === 'edge') {
    const edge = diagram.edges.find((candidate) => candidate.id === selection.edgeId);
    return edge ? <EdgeInspector edge={edge} /> : null;
  }
  const node = findNode(diagram, selection.nodeId);
  if (!node) return null;
  if (selection.type === 'node') return <NodeInspector node={node} />;
  const item = node.items.find((candidate) => candidate.id === selection.itemId);
  return item ? <ItemInspector node={node} item={item} /> : null;
}

export function Inspector() {
  const diagram = useDiagramState((state) => state.diagram);
  const selection = useDiagramState((state) => state.selection);
  return (
    <aside
      data-testid="inspector"
      className="w-72 shrink-0 overflow-y-auto border-l bg-slate-50 p-3 text-sm"
    >
      {content(diagram, selection)}
    </aside>
  );
}
