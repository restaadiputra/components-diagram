import { describe, expect, it } from 'vitest';
import { ITEM_KIND_VALUES, NODE_KIND_VALUES } from './diagram';
import { allowsItem, ITEM_KIND_LABELS, NODE_KINDS } from './node-kinds';

describe('node kind registry', () => {
  it('has a spec for every node kind, keyed by its own kind', () => {
    for (const kind of NODE_KIND_VALUES) {
      expect(NODE_KINDS[kind].kind).toBe(kind);
      expect(NODE_KINDS[kind].itemKinds.length).toBeGreaterThan(0);
    }
  });

  it('has a section label for every item kind', () => {
    for (const kind of ITEM_KIND_VALUES) {
      expect(ITEM_KIND_LABELS[kind]).not.toBe('');
    }
  });

  it('allows only the item kinds registered for a node kind', () => {
    expect(allowsItem('component', 'state')).toBe(true);
    expect(allowsItem('component', 'method')).toBe(false);
    expect(allowsItem('hook', 'return')).toBe(true);
    expect(allowsItem('context', 'value')).toBe(true);
    expect(allowsItem('service', 'state')).toBe(false);
    expect(allowsItem('query-cache', 'mutation')).toBe(true);
  });
});
