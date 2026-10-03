import { canConnect } from './connection-rules';
import type { Diagram, DiagramEdge } from './diagram';
import { allowsItem } from './node-kinds';

/** An item its node kind does not allow is never rendered and cannot be deleted. */
export function dropDisallowedItems(diagram: Diagram): Diagram {
  const nodes = diagram.nodes.map((node) => {
    const items = node.items.filter((item) => allowsItem(node.kind, item.kind));
    return items.length === node.items.length ? node : { ...node, items };
  });
  const unchanged = nodes.every((node, index) => node === diagram.nodes[index]);
  return unchanged ? diagram : { ...diagram, nodes };
}

/** Each edge must pass the rules a user's own connection would, judged against the edges kept so far. */
function acceptEdges(base: Diagram, candidates: DiagramEdge[]): Set<DiagramEdge> {
  const accepted = new Set<DiagramEdge>();
  let current = base;
  for (const edge of candidates) {
    if (!canConnect(current, edge)) continue;
    accepted.add(edge);
    current = { ...current, edges: [...current.edges, edge] };
  }
  return accepted;
}

/**
 * Re-applies the connection rules to a loaded file. A binds-hook edge is only valid
 * next to a uses-hook edge, so those are judged last: file order must not matter.
 */
export function dropDisallowedEdges(diagram: Diagram): Diagram {
  const bare = { ...diagram, edges: [] };
  const independent = diagram.edges.filter((edge) => edge.kind !== 'binds-hook');
  const bindings = diagram.edges.filter((edge) => edge.kind === 'binds-hook');
  const first = acceptEdges(bare, independent);
  const second = acceptEdges({ ...bare, edges: [...first] }, bindings);
  const edges = diagram.edges.filter((edge) => first.has(edge) || second.has(edge));
  return edges.length === diagram.edges.length ? diagram : { ...diagram, edges };
}
