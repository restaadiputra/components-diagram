export const NODE_KIND_VALUES = ['component', 'hook', 'context', 'service', 'query-cache'] as const;
export type NodeKind = (typeof NODE_KIND_VALUES)[number];

export const ITEM_KIND_VALUES = [
  'prop',
  'state',
  'derived',
  'effect',
  'handler',
  'ref',
  'parameter',
  'return',
  'value',
  'method',
  'query',
  'mutation',
  'cache-key',
] as const;
export type ItemKind = (typeof ITEM_KIND_VALUES)[number];

export const LINK_RELATION_VALUES = ['reads', 'sets', 'depends-on'] as const;
export type LinkRelation = (typeof LINK_RELATION_VALUES)[number];

export const EDGE_KIND_VALUES = [
  'renders',
  'passes-prop',
  'passes-callback',
  'provides',
  'consumes',
  'uses-hook',
  'binds-hook',
  'calls',
  'invalidates',
] as const;
export type EdgeKind = (typeof EDGE_KIND_VALUES)[number];

export interface Position {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  type?: string;
  note?: string;
}

/** A relationship between two items of the same node. */
export interface InternalLink {
  id: string;
  fromItemId: string;
  toItemId: string;
  relation: LinkRelation;
}

export interface DiagramNode {
  id: string;
  kind: NodeKind;
  name: string;
  position: Position;
  collapsed: boolean;
  items: Item[];
  links: InternalLink[];
}

/** One end of an edge. Without `itemId` it refers to the node as a whole. */
export interface Endpoint {
  nodeId: string;
  itemId?: string;
}

export interface DiagramEdge {
  id: string;
  kind: EdgeKind;
  source: Endpoint;
  target: Endpoint;
}

export interface Diagram {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
}

export const CURRENT_SCHEMA_VERSION = 1;

export function createDiagram(id: string, name: string, now: string): Diagram {
  return {
    id,
    name,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function findNode(diagram: Diagram, nodeId: string): DiagramNode | undefined {
  return diagram.nodes.find((node) => node.id === nodeId);
}

export function findItem(diagram: Diagram, endpoint: Endpoint): Item | undefined {
  if (endpoint.itemId === undefined) return undefined;
  return findNode(diagram, endpoint.nodeId)?.items.find((item) => item.id === endpoint.itemId);
}

export function sameEndpoint(a: Endpoint, b: Endpoint): boolean {
  return a.nodeId === b.nodeId && a.itemId === b.itemId;
}

export function parseNodeKind(value: string): NodeKind | undefined {
  return NODE_KIND_VALUES.find((kind) => kind === value);
}
