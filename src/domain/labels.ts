import { findNode, type Diagram, type Endpoint } from './diagram';

const UNKNOWN = 'unknown';

/** `"Page.cartItems"` */
export function itemLabel(diagram: Diagram, itemId: string): string {
  for (const node of diagram.nodes) {
    const item = node.items.find((candidate) => candidate.id === itemId);
    if (item) return `${node.name}.${item.name}`;
  }
  return UNKNOWN;
}

export function endpointLabel(diagram: Diagram, endpoint: Endpoint): string {
  if (endpoint.itemId !== undefined) return itemLabel(diagram, endpoint.itemId);
  return findNode(diagram, endpoint.nodeId)?.name ?? UNKNOWN;
}
