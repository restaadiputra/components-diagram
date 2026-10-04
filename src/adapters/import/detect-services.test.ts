import { describe, expect, it } from 'vitest';
import { edgeKinds, named, run } from './testing/run-analyzer';

const files = {
  'src/api.ts': `export function saveCart(items: string[]) { return fetch('/cart'); }`,
  'src/page.tsx': `
    import { useEffect } from 'react';
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { saveCart } from './api';
    export function Page() {
      const { data } = useQuery({ queryKey: ['cart'], queryFn: () => saveCart([]) });
      const client = useQueryClient();
      const save = useMutation({
        mutationFn: saveCart,
        onSuccess: () => client.invalidateQueries({ queryKey: ['cart'] }),
      });
      const submit = () => { saveCart([]); save.mutate([]); };
      return <button onClick={submit} />;
    }
  `,
};

describe('detectServices', () => {
  it('creates a service with a method for a function from another file', async () => {
    const result = await run(files);
    const api = named(result, 'api');
    expect(api?.kind).toBe('service');
    expect(api?.items.map((item) => item.name)).toEqual(['saveCart']);
  });

  it('creates a query-cache node per query key and feeds the query result', async () => {
    const result = await run(files);
    const cart = named(result, 'cart');
    expect(cart?.kind).toBe('query-cache');
    expect(cart?.items.map((item) => item.kind)).toEqual(['query']);
    expect(edgeKinds(result)).toContain('consumes');
  });

  it('connects a handler to the service and to the mutation', async () => {
    const result = await run(files);
    const calls = result.edges.filter((edge) => edge.kind === 'calls');
    expect(calls).toHaveLength(2);
    const targets = new Set(calls.map((edge) => edge.target.nodeId));
    expect(targets.has(named(result, 'api')?.id ?? '')).toBe(true);
    expect(targets.has(named(result, 'save')?.id ?? '')).toBe(true);
  });

  it('links a mutation to the query it invalidates', async () => {
    const result = await run(files);
    const invalidates = result.edges.find((edge) => edge.kind === 'invalidates');
    expect(invalidates?.source.nodeId).toBe(named(result, 'save')?.id);
    expect(invalidates?.target.nodeId).toBe(named(result, 'cart')?.id);
  });
});
