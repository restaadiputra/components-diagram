import dagre from '@dagrejs/dagre';
import type { DiagramLayout } from '../../application/ports/diagram-layout';
import type { DiagramEdge, DiagramNode, Position } from '../../domain/diagram';
import { estimateNodeSize, NODE_METRICS } from './estimate-node-size';

const GAP = 40;
/** A rank taller than this is split into columns, so large imports stay near screen proportions. */
export const MAX_COLUMN_HEIGHT = 1800;
type Pair = readonly [string, string];

/** Node-to-node pairs, source first, without duplicates, self-loops or unknown ids. */
function nodePairs(nodes: DiagramNode[], edges: DiagramEdge[]): Pair[] {
  const known = new Set(nodes.map((node) => node.id));
  const seen = new Set<string>();
  const pairs: Pair[] = [];
  for (const { source, target } of edges) {
    const key = `${source.nodeId}>${target.nodeId}`;
    const valid =
      known.has(source.nodeId) && known.has(target.nodeId) && source.nodeId !== target.nodeId;
    if (!valid || seen.has(key)) continue;
    seen.add(key);
    pairs.push([source.nodeId, target.nodeId]);
  }
  return pairs;
}

function layered(nodes: DiagramNode[], pairs: Pair[]): Map<string, Position> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: GAP, ranksep: 120, acyclicer: 'greedy' });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) graph.setNode(node.id, estimateNodeSize(node));
  for (const [from, to] of pairs) graph.setEdge(from, to);
  dagre.layout(graph);
  return new Map(
    nodes.map((node) => {
      // dagre types node labels as any; we set them above and it adds x/y.
      const { x, y } = graph.node(node.id) as Position;
      const { width, height } = estimateNodeSize(node);
      return [node.id, { x: x - width / 2, y: y - height / 2 }];
    }),
  );
}

/** Fills columns top to bottom in the given order, starting a new one when the height limit is reached. */
function splitColumns(ordered: DiagramNode[]): DiagramNode[][] {
  const columns: DiagramNode[][] = [[]];
  let used = 0;
  for (const node of ordered) {
    const height = estimateNodeSize(node).height;
    const current = columns[columns.length - 1] ?? [];
    if (current.length > 0 && used + GAP + height > MAX_COLUMN_HEIGHT) {
      columns.push([node]);
      used = height;
    } else {
      current.push(node);
      used += (current.length > 1 ? GAP : 0) + height;
      if (current.length === 1) columns[columns.length - 1] = current;
    }
  }
  return columns;
}

/**
 * Splits ranks (nodes sharing an x) that are too tall into side-by-side columns and shifts
 * every later rank right by the width added. A rank that fits keeps dagre's positions.
 */
function wrapTallRanks(
  nodes: DiagramNode[],
  positions: Map<string, Position>,
): Map<string, Position> {
  const ranks = new Map<number, DiagramNode[]>();
  for (const node of nodes) {
    const x = Math.round(positions.get(node.id)?.x ?? 0);
    ranks.set(x, [...(ranks.get(x) ?? []), node]);
  }
  const wrapped = new Map<string, Position>();
  const cell = NODE_METRICS.width + GAP;
  let shift = 0;
  for (const x of [...ranks.keys()].sort((a, b) => a - b)) {
    const y = (node: DiagramNode) => positions.get(node.id)?.y ?? 0;
    const ordered = [...(ranks.get(x) ?? [])].sort((a, b) => y(a) - y(b));
    const columns = splitColumns(ordered);
    const top = Math.min(...ordered.map(y));
    columns.forEach((column, index) => {
      let offset = top;
      for (const node of column) {
        const stacked = columns.length === 1 ? y(node) : offset;
        wrapped.set(node.id, { x: x + shift + index * cell, y: stacked });
        offset += estimateNodeSize(node).height + GAP;
      }
    });
    shift += (columns.length - 1) * cell;
  }
  return wrapped;
}

/** Rows of roughly square shape, starting at `top`. */
function grid(nodes: DiagramNode[], top: number): Map<string, Position> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const cell = NODE_METRICS.width + GAP;
  const placed = new Map<string, Position>();
  let y = top;
  for (let start = 0; start < nodes.length; start += columns) {
    const row = nodes.slice(start, start + columns);
    row.forEach((node, index) => placed.set(node.id, { x: index * cell, y }));
    y += Math.max(...row.map((node) => estimateNodeSize(node).height)) + GAP;
  }
  return placed;
}

function bottom(nodes: DiagramNode[], positions: Map<string, Position>): number {
  return Math.max(
    0,
    ...nodes.map((node) => (positions.get(node.id)?.y ?? 0) + estimateNodeSize(node).height),
  );
}

export const dagreLayout: DiagramLayout = (nodes, edges) => {
  const pairs = nodePairs(nodes, edges);
  const linked = new Set(pairs.flat());
  const connected = nodes.filter((node) => linked.has(node.id));
  const alone = nodes.filter((node) => !linked.has(node.id));
  const positions = wrapTallRanks(connected, layered(connected, pairs));
  const below = grid(alone, connected.length === 0 ? 0 : bottom(connected, positions) + GAP * 2);
  const all = new Map([...positions, ...below]);
  const xs = [...all.values()].map((p) => p.x);
  const ys = [...all.values()].map((p) => p.y);
  // Translate so the top-left node sits at the origin.
  const minX = xs.length === 0 ? 0 : Math.min(...xs);
  const minY = ys.length === 0 ? 0 : Math.min(...ys);
  return nodes.map((node) => {
    const at = all.get(node.id) ?? { x: 0, y: 0 };
    return { ...node, position: { x: Math.round(at.x - minX), y: Math.round(at.y - minY) } };
  });
};
