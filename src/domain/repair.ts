import {
  DEFAULT_VIEWPORT,
  findNode,
  type Diagram,
  type DiagramNode,
  type Endpoint,
} from './diagram';
import { dropUnusableIds } from './repair-ids';
import { dropDisallowedEdges, dropDisallowedItems } from './repair-kinds';

function endpointExists(diagram: Diagram, endpoint: Endpoint): boolean {
  const node = findNode(diagram, endpoint.nodeId);
  if (!node) return false;
  return endpoint.itemId === undefined || node.items.some((item) => item.id === endpoint.itemId);
}

function withSoundLinks(node: DiagramNode): DiagramNode {
  const ids = new Set(node.items.map((item) => item.id));
  const links = node.links.filter((link) => ids.has(link.fromItemId) && ids.has(link.toItemId));
  return links.length === node.links.length ? node : { ...node, links };
}

function dropDanglingReferences(diagram: Diagram): Diagram {
  const nodes = diagram.nodes.map(withSoundLinks);
  const edges = diagram.edges.filter(
    (edge) => endpointExists(diagram, edge.source) && endpointExists(diagram, edge.target),
  );
  const unchanged =
    edges.length === diagram.edges.length &&
    nodes.every((node, index) => node === diagram.nodes[index]);
  return unchanged ? diagram : { ...diagram, nodes, edges };
}

function countEntities(diagram: Diagram): number {
  const inNodes = diagram.nodes.reduce(
    (total, node) => total + 1 + node.items.length + node.links.length,
    0,
  );
  return inNodes + diagram.edges.length;
}

function isUsableViewport({ x, y, zoom }: Diagram['viewport']): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(zoom) && zoom > 0;
}

/**
 * Later steps rely on earlier ones: bad ids go first so every lookup is unambiguous,
 * and dangling references are swept after items and nodes are gone, before the
 * connection rules (which treat a missing endpoint as a refusal) judge what is left.
 */
const STEPS = [dropUnusableIds, dropDisallowedItems, dropDanglingReferences, dropDisallowedEdges];

/**
 * A file edited by hand or damaged in storage must still open: drop whatever is
 * invalid, together with whatever referenced it, and count each dropped entity.
 * A bad viewport is reset instead, because no user data is lost.
 */
export function repairDiagram(diagram: Diagram): { diagram: Diagram; dropped: number } {
  const repaired = STEPS.reduce((current, step) => step(current), diagram);
  const dropped = countEntities(diagram) - countEntities(repaired);
  if (isUsableViewport(repaired.viewport)) return { diagram: repaired, dropped };
  return { diagram: { ...repaired, viewport: { ...DEFAULT_VIEWPORT } }, dropped };
}
