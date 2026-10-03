import {
  createDiagram,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type EdgeKind,
  type Endpoint,
  type InternalLink,
  type Item,
  type ItemKind,
  type LinkRelation,
  type NodeKind,
} from '../diagram';

/** Builds an item whose name equals its id, so tests read naturally. */
export function item(id: string, kind: ItemKind): Item {
  return { id, kind, name: id };
}

/** `link('l1', 'sets', 'onAdd->cartItems')` */
export function link(id: string, relation: LinkRelation, path: string): InternalLink {
  const [fromItemId = '', toItemId = ''] = path.split('->');
  return { id, fromItemId, toItemId, relation };
}

export function node(
  id: string,
  kind: NodeKind,
  content: { items?: Item[]; links?: InternalLink[] } = {},
): DiagramNode {
  return {
    id,
    kind,
    name: id,
    position: { x: 0, y: 0 },
    collapsed: false,
    items: content.items ?? [],
    links: content.links ?? [],
  };
}

/** `ep('Page/cartItems')` is an item endpoint, `ep('Page')` a node endpoint. */
export function ep(path: string): Endpoint {
  const [nodeId = '', itemId] = path.split('/');
  return itemId === undefined ? { nodeId } : { nodeId, itemId };
}

/** `edge('e1', 'passes-prop', 'Page/cartItems->List/items')` */
export function edge(id: string, kind: EdgeKind, path: string): DiagramEdge {
  const [from = '', to = ''] = path.split('->');
  return { id, kind, source: ep(from), target: ep(to) };
}

export function diagramOf(nodes: DiagramNode[], edges: DiagramEdge[] = []): Diagram {
  return { ...createDiagram('d1', 'Test', '2026-01-01T00:00:00.000Z'), nodes, edges };
}
