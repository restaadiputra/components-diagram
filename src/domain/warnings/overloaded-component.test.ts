import { describe, expect, it } from 'vitest';
import type { Item, ItemKind } from '../diagram';
import { diagramOf, item, node } from '../testing/fixtures';
import { overloadedComponent } from './overloaded-component';
import { WARNING_THRESHOLDS } from './types';

function items(kind: ItemKind, count: number, prefix = kind): Item[] {
  return Array.from({ length: count }, (_, index) => item(`${prefix}${index.toString()}`, kind));
}

const run = (...nodes: ReturnType<typeof node>[]) =>
  overloadedComponent(diagramOf(nodes), WARNING_THRESHOLDS);

describe('overloaded-component', () => {
  it('stays quiet at the limits', () => {
    const page = node('Page', 'component', {
      items: [...items('prop', 6), ...items('state', 6)],
    });
    expect(run(page)).toEqual([]);
  });

  it('warns when there are more than 12 items', () => {
    const page = node('Page', 'component', { items: items('state', 13) });
    expect(run(page)).toEqual([
      {
        ruleId: 'overloaded-component',
        target: { nodeId: 'Page' },
        message: 'Page has 13 items (limit 12)',
        relatedNodeIds: [],
      },
    ]);
  });

  it('warns when there are more than 6 props', () => {
    const page = node('Page', 'component', { items: items('prop', 7) });
    expect(run(page)[0]?.message).toBe('Page has 7 props (limit 6)');
  });

  it('names every limit that is exceeded, in one warning', () => {
    const page = node('Page', 'component', {
      items: [...items('prop', 7), ...items('state', 6)],
    });
    expect(run(page)).toHaveLength(1);
    expect(run(page)[0]?.message).toBe('Page has 13 items (limit 12) and 7 props (limit 6)');
  });

  it('ignores nodes that are not components', () => {
    expect(run(node('useBig', 'hook', { items: items('state', 20) }))).toEqual([]);
  });
});
