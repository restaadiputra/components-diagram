import type { ItemKind, NodeKind } from './diagram';

export interface NodeKindSpec {
  kind: NodeKind;
  label: string;
  defaultName: string;
  color: string;
  icon: string;
  /** Item kinds this node may hold, in the order their sections are shown. */
  itemKinds: readonly ItemKind[];
}

/** Adding a node kind means adding an entry here; nothing else switches on kind. */
export const NODE_KINDS: Record<NodeKind, NodeKindSpec> = {
  component: {
    kind: 'component',
    label: 'Component',
    defaultName: 'Component',
    color: '#2563eb',
    icon: '⚛',
    itemKinds: ['prop', 'state', 'derived', 'effect', 'handler', 'ref'],
  },
  hook: {
    kind: 'hook',
    label: 'Hook',
    defaultName: 'useHook',
    color: '#7c3aed',
    icon: '↯',
    itemKinds: ['parameter', 'state', 'derived', 'effect', 'handler', 'return'],
  },
  context: {
    kind: 'context',
    label: 'Context',
    defaultName: 'Context',
    color: '#059669',
    icon: '◎',
    itemKinds: ['value'],
  },
  service: {
    kind: 'service',
    label: 'Service',
    defaultName: 'service',
    color: '#d97706',
    icon: '⚙',
    itemKinds: ['method'],
  },
  'query-cache': {
    kind: 'query-cache',
    label: 'Query / cache',
    defaultName: 'query',
    color: '#db2777',
    icon: '⛁',
    itemKinds: ['query', 'mutation', 'cache-key'],
  },
};

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  prop: 'Props',
  state: 'State',
  derived: 'Derived',
  effect: 'Effects',
  handler: 'Handlers',
  ref: 'Refs',
  parameter: 'Parameters',
  return: 'Returns',
  value: 'Values',
  method: 'Methods',
  query: 'Queries',
  mutation: 'Mutations',
  'cache-key': 'Cache keys',
};

export function allowsItem(nodeKind: NodeKind, itemKind: ItemKind): boolean {
  return NODE_KINDS[nodeKind].itemKinds.includes(itemKind);
}
