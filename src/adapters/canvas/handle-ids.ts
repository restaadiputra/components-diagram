import type { Endpoint } from '../../domain/diagram';

const NODE_HANDLE = 'node';

/** `in:<itemId>` / `out:<itemId>`, or `in:node` / `out:node` for the node itself. */
export function handleId(side: 'in' | 'out', itemId?: string): string {
  return `${side}:${itemId ?? NODE_HANDLE}`;
}

export function toEndpoint(nodeId: string, handle: string | null | undefined): Endpoint {
  const itemId = handle?.split(':')[1];
  return itemId === undefined || itemId === NODE_HANDLE ? { nodeId } : { nodeId, itemId };
}
