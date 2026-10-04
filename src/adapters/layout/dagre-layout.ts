import dagre from '@dagrejs/dagre';
import type { DiagramLayout } from '../../application/ports/diagram-layout';
import type { DiagramEdge, DiagramNode, Position } from '../../domain/diagram';
import { estimateNodeSize, NODE_METRICS } from './estimate-node-size';

const GAP = 40;
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
  const positions = layered(connected, pairs);
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
