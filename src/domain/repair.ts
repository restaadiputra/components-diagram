import { findNode, type Diagram, type DiagramNode, type Endpoint } from './diagram';

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

function countLinks(nodes: DiagramNode[]): number {
  return nodes.reduce((total, node) => total + node.links.length, 0);
}

/** A file edited by hand or damaged in storage must still open. */
export function dropDanglingReferences(diagram: Diagram): { diagram: Diagram; dropped: number } {
  const nodes = diagram.nodes.map(withSoundLinks);
  const edges = diagram.edges.filter(
    (edge) => endpointExists(diagram, edge.source) && endpointExists(diagram, edge.target),
  );
  const dropped =
    diagram.edges.length - edges.length + countLinks(diagram.nodes) - countLinks(nodes);
  return dropped === 0 ? { diagram, dropped } : { diagram: { ...diagram, nodes, edges }, dropped };
}
