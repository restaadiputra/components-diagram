import { describe, expect, it } from 'vitest';
import { EDGE_KIND_VALUES } from './diagram';
import { EDGE_KINDS } from './edge-kinds';

describe('edge kind registry', () => {
  it('has at least one connection rule for every edge kind', () => {
    for (const kind of EDGE_KIND_VALUES) {
      expect(EDGE_KINDS[kind].kind).toBe(kind);
      expect(EDGE_KINDS[kind].rules.length).toBeGreaterThan(0);
    }
  });

  it('marks structural edges as not traced', () => {
    const structural = EDGE_KIND_VALUES.filter((kind) => !EDGE_KINDS[kind].traced);
    expect(structural).toEqual(['renders', 'provides', 'uses-hook']);
  });

  it('attaches structural edges to whole nodes', () => {
    for (const kind of ['renders', 'provides', 'uses-hook'] as const) {
      for (const rule of EDGE_KINDS[kind].rules) {
        expect(rule.source.itemKinds).toBe('node');
        expect(rule.target.itemKinds).toBe('node');
      }
    }
  });
});
