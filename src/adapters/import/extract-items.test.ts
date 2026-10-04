import { describe, expect, it } from 'vitest';
import { named, run } from './testing/run-analyzer';

const source = `
  import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
  export const Theme = createContext('x');
  export function useCart(initial: string[]) {
    const [items, setItems] = useState(initial);
    const add = (item: string) => setItems([...items, item]);
    return { items, add };
  }
  export function Page({ title, onClose }: { title: string; onClose: () => void }) {
    const [count, setCount] = useState(0);
    const box = useRef(null);
    const doubled = useMemo(() => count * 2, [count]);
    const theme = useContext(Theme);
    const { items } = useCart([]);
    const label = title + count;
    useEffect(() => { setCount(1); }, []);
    function reset() { setCount(0); }
    return <div ref={box} />;
  }
`;

const kindsOf = (result: Awaited<ReturnType<typeof run>>, node: string) =>
  Object.fromEntries(named(result, node)?.items.map((item) => [item.name, item.kind]) ?? []);

describe('extractItems', () => {
  it('extracts component props, state, refs, derived values, effects and handlers', async () => {
    const kinds = kindsOf(await run({ 'src/a.tsx': source }), 'Page');
    expect(kinds).toMatchObject({
      title: 'prop',
      onClose: 'prop',
      count: 'state',
      box: 'ref',
      doubled: 'derived',
      theme: 'derived',
      items: 'derived',
      label: 'derived',
      reset: 'handler',
    });
    expect(Object.values(kinds).filter((kind) => kind === 'effect')).toHaveLength(1);
  });

  it('extracts hook parameters, state, handlers and returns', async () => {
    const kinds = kindsOf(await run({ 'src/a.tsx': source }), 'useCart');
    expect(kinds).toMatchObject({ initial: 'parameter', items: 'return', add: 'return' });
  });

  it('gives a context a single value item', async () => {
    const kinds = kindsOf(await run({ 'src/a.tsx': source }), 'Theme');
    expect(kinds).toEqual({ value: 'value' });
  });

  it('keeps hook items in order: parameters first, then state, then returns', async () => {
    const result = await run({ 'src/a.tsx': source });
    expect(named(result, 'useCart')?.items.map((item) => item.kind)).toEqual([
      'parameter',
      'state',
      'handler',
      'return',
      'return',
    ]);
  });
});
