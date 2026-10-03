import type { Diagram, EdgeKind, LinkRelation } from './diagram';
import { EDGE_KINDS } from './edge-kinds';
import { orderByFlow } from './trace-order';

export type TraceVia =
  | { type: 'edge'; id: string; kind: EdgeKind }
  | { type: 'link'; id: string; relation: LinkRelation };

export interface TraceStep {
  fromItemId: string;
  toItemId: string;
  via: TraceVia;
}

export interface TraceResult {
  itemIds: string[];
  linkIds: string[];
  edgeIds: string[];
  steps: TraceStep[];
}

/** One hop of data flow between two items. */
interface Arc {
  from: string;
  to: string;
  via: TraceVia;
}

function edgeArcs(diagram: Diagram): Arc[] {
  return diagram.edges.flatMap((edge) => {
    const from = edge.source.itemId;
    const to = edge.target.itemId;
    if (!EDGE_KINDS[edge.kind].traced || from === undefined || to === undefined) return [];
    return [{ from, to, via: { type: 'edge', id: edge.id, kind: edge.kind } }];
  });
}

function linkArcs(diagram: Diagram): Arc[] {
  return diagram.nodes.flatMap((node) =>
    node.links.map((link): Arc => {
      const via: TraceVia = { type: 'link', id: link.id, relation: link.relation };
      // "handler sets state" flows handler → state; a reader or dependent
      // receives the value, so those flow the other way.
      return link.relation === 'sets'
        ? { from: link.fromItemId, to: link.toItemId, via }
        : { from: link.toItemId, to: link.fromItemId, via };
    }),
  );
}

/** Breadth-first walk. Each item is expanded once, so cycles terminate. */
function walk(arcs: Arc[], start: string, direction: 'up' | 'down'): Arc[] {
  const visited = new Set([start]);
  const queue = [start];
  const found: Arc[] = [];
  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    for (const arc of arcs) {
      const [near, far] = direction === 'down' ? [arc.from, arc.to] : [arc.to, arc.from];
      if (near !== current) continue;
      found.push(arc);
      if (!visited.has(far)) {
        visited.add(far);
        queue.push(far);
      }
    }
  }
  return found;
}

/** An edge and a link may share an id string, so the key includes the type. */
function unique(arcs: Arc[]): Arc[] {
  const seen = new Set<string>();
  return arcs.filter((arc) => {
    const key = `${arc.via.type}:${arc.via.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function trace(diagram: Diagram, itemId: string): TraceResult {
  const arcs = [...edgeArcs(diagram), ...linkArcs(diagram)];
  const upstream = walk(arcs, itemId, 'up').reverse();
  const downstream = walk(arcs, itemId, 'down');
  const path = orderByFlow(unique([...upstream, ...downstream]));
  return {
    itemIds: [...new Set([itemId, ...path.flatMap((arc) => [arc.from, arc.to])])],
    linkIds: path.filter((arc) => arc.via.type === 'link').map((arc) => arc.via.id),
    edgeIds: path.filter((arc) => arc.via.type === 'edge').map((arc) => arc.via.id),
    steps: path.map((arc) => ({ fromItemId: arc.from, toItemId: arc.to, via: arc.via })),
  };
}
