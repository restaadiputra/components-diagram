import type { Diagram, DiagramEdge } from '../../domain/diagram';

function joinsSameNodes(a: DiagramEdge, b: DiagramEdge): boolean {
  const pair = [a.source.nodeId, a.target.nodeId];
  return pair.includes(b.source.nodeId) && pair.includes(b.target.nodeId);
}

export function removeEdge(diagram: Diagram, edgeId: string): Diagram {
  const removed = diagram.edges.find((edge) => edge.id === edgeId);
  if (!removed) return diagram;
  // Hook bindings are only valid while the hook is used, so they go with it.
  const orphaned = (edge: DiagramEdge) =>
    removed.kind === 'uses-hook' && edge.kind === 'binds-hook' && joinsSameNodes(removed, edge);
  return {
    ...diagram,
    edges: diagram.edges.filter((edge) => edge.id !== edgeId && !orphaned(edge)),
  };
}
