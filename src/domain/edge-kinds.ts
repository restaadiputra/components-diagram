import type { EdgeKind, ItemKind, NodeKind } from './diagram';

export interface EndpointRule {
  nodeKinds: readonly NodeKind[];
  /** `'node'` means the edge attaches to the node itself, not to an item. */
  itemKinds: readonly ItemKind[] | 'node';
}

export interface ConnectionRule {
  source: EndpointRule;
  target: EndpointRule;
}

export interface EdgeKindSpec {
  kind: EdgeKind;
  label: string;
  /** Reads as "<source> <verb> <target>" in a trace step. */
  verb: string;
  color: string;
  dash: 'solid' | 'dashed' | 'dotted';
  /** Structural edges describe the tree; data does not flow along them. */
  traced: boolean;
  rules: readonly ConnectionRule[];
}

const USERS: readonly NodeKind[] = ['component', 'hook'];
/** Items of a component or hook that can receive a value from outside. */
const RECEIVERS: readonly ItemKind[] = ['state', 'derived', 'effect', 'handler', 'ref', 'return'];

const componentNode: EndpointRule = { nodeKinds: ['component'], itemKinds: 'node' };
const componentProp: EndpointRule = { nodeKinds: ['component'], itemKinds: ['prop'] };
const receiver: EndpointRule = { nodeKinds: USERS, itemKinds: RECEIVERS };

export const EDGE_KINDS: Record<EdgeKind, EdgeKindSpec> = {
  renders: {
    kind: 'renders',
    label: 'Renders',
    verb: 'renders',
    color: '#64748b',
    dash: 'solid',
    traced: false,
    rules: [{ source: componentNode, target: componentNode }],
  },
  'passes-prop': {
    kind: 'passes-prop',
    label: 'Passes prop',
    verb: 'is passed as prop to',
    color: '#2563eb',
    dash: 'solid',
    traced: true,
    rules: [
      {
        source: { nodeKinds: ['component'], itemKinds: ['prop', 'state', 'derived'] },
        target: componentProp,
      },
    ],
  },
  'passes-callback': {
    kind: 'passes-callback',
    label: 'Passes callback',
    verb: 'is passed as callback to',
    color: '#ea580c',
    dash: 'dashed',
    traced: true,
    rules: [
      {
        source: { nodeKinds: ['component'], itemKinds: ['handler', 'prop'] },
        target: componentProp,
      },
    ],
  },
  provides: {
    kind: 'provides',
    label: 'Provides context',
    verb: 'provides',
    color: '#059669',
    dash: 'dotted',
    traced: false,
    rules: [{ source: componentNode, target: { nodeKinds: ['context'], itemKinds: 'node' } }],
  },
  consumes: {
    kind: 'consumes',
    label: 'Consumes',
    verb: 'is consumed by',
    color: '#059669',
    dash: 'dotted',
    traced: true,
    rules: [
      { source: { nodeKinds: ['context'], itemKinds: ['value'] }, target: receiver },
      { source: { nodeKinds: ['query-cache'], itemKinds: ['query'] }, target: receiver },
    ],
  },
  'uses-hook': {
    kind: 'uses-hook',
    label: 'Uses hook',
    verb: 'uses',
    color: '#7c3aed',
    dash: 'solid',
    traced: false,
    rules: [
      {
        source: { nodeKinds: USERS, itemKinds: 'node' },
        target: { nodeKinds: ['hook'], itemKinds: 'node' },
      },
    ],
  },
  'binds-hook': {
    kind: 'binds-hook',
    label: 'Binds hook value',
    verb: 'is bound to',
    color: '#7c3aed',
    dash: 'dashed',
    traced: true,
    rules: [
      {
        source: {
          nodeKinds: USERS,
          itemKinds: ['prop', 'state', 'derived', 'handler', 'ref', 'parameter'],
        },
        target: { nodeKinds: ['hook'], itemKinds: ['parameter'] },
      },
      { source: { nodeKinds: ['hook'], itemKinds: ['return'] }, target: receiver },
    ],
  },
  calls: {
    kind: 'calls',
    label: 'Calls',
    verb: 'calls',
    color: '#d97706',
    dash: 'solid',
    traced: true,
    rules: [
      {
        source: {
          nodeKinds: ['component', 'hook', 'query-cache', 'service'],
          itemKinds: ['handler', 'effect', 'query', 'mutation', 'method'],
        },
        target: {
          nodeKinds: ['service', 'query-cache'],
          itemKinds: ['method', 'query', 'mutation'],
        },
      },
    ],
  },
  invalidates: {
    kind: 'invalidates',
    label: 'Invalidates',
    verb: 'invalidates',
    color: '#db2777',
    dash: 'dashed',
    traced: true,
    rules: [
      {
        source: { nodeKinds: ['query-cache'], itemKinds: ['mutation'] },
        target: { nodeKinds: ['query-cache'], itemKinds: ['query', 'cache-key'] },
      },
    ],
  },
};
