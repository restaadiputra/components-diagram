import { describe, expect, it } from 'vitest';
import { files as cart } from './fixtures/cart-app';
import { files as context } from './fixtures/context-app';
import { files as query } from './fixtures/query-app';
import { edgeKinds, run } from './testing/run-analyzer';

describe('fixture projects', () => {
  it('cart app: page, list, hook and service', async () => {
    const result = await run(cart);
    expect(result.nodes.map((node) => node.name).sort()).toEqual([
      'List',
      'Page',
      'api',
      'useCart',
    ]);
    expect(edgeKinds(result).sort()).toEqual([
      'binds-hook',
      'binds-hook',
      'binds-hook',
      'calls',
      'passes-callback',
      'passes-prop',
      'renders',
      'uses-hook',
    ]);
    expect(result.report.counts.tracedProps).toBe(2);
  });

  it('context app: one provider, two consumers', async () => {
    const result = await run(context);
    expect(edgeKinds(result).filter((kind) => kind === 'consumes')).toHaveLength(2);
    expect(edgeKinds(result)).toContain('provides');
  });

  it('query app: query, mutation and invalidation', async () => {
    const result = await run(query);
    expect(edgeKinds(result)).toEqual(expect.arrayContaining(['consumes', 'calls', 'invalidates']));
  });

  it('is deterministic: two runs give the same result', async () => {
    expect(await run(cart)).toEqual(await run(cart));
  });
});
