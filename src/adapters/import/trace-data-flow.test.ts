import { describe, expect, it } from 'vitest';
import { named, run } from './testing/run-analyzer';

const files = {
  'src/theme.ts': `import { createContext } from 'react'; export const Theme = createContext('x');`,
  'src/use-cart.ts': `
    import { useState } from 'react';
    export function useCart(initial: string[]) {
      const [items, setItems] = useState(initial);
      const add = (i: string) => setItems([...items, i]);
      return { items, add };
    }
  `,
  'src/list.tsx': `export function List({ rows, onPick }: { rows: string[]; onPick: () => void }) { return <ul />; }`,
  'src/page.tsx': `
    import { useState } from 'react';
    import { Theme } from './theme';
    import { useCart } from './use-cart';
    import { List } from './list';
    export function Page(props: any) {
      const [seed] = useState<string[]>([]);
      const theme = useContext(Theme);
      const { items, add } = useCart(seed);
      const pick = () => add('x');
      return <List rows={items} onPick={pick} {...props} extra={1 + 1} />;
    }
  `,
};

const find = (result: Awaited<ReturnType<typeof run>>, kind: string) =>
  result.edges.filter((edge) => edge.kind === kind);

const itemId = (result: Awaited<ReturnType<typeof run>>, node: string, item: string) =>
  named(result, node)?.items.find((candidate) => candidate.name === item)?.id;

describe('traceDataFlow', () => {
  it('passes a state-derived value as a prop and a handler as a callback', async () => {
    const result = await run(files);
    const prop = find(result, 'passes-prop')[0];
    expect(prop?.source).toEqual({
      nodeId: named(result, 'Page')?.id,
      itemId: itemId(result, 'Page', 'items'),
    });
    expect(prop?.target).toEqual({
      nodeId: named(result, 'List')?.id,
      itemId: itemId(result, 'List', 'rows'),
    });
    expect(find(result, 'passes-callback')).toHaveLength(1);
  });

  it('counts traced and unresolved props and reports spread props', async () => {
    const result = await run(files);
    expect(result.report.counts.tracedProps).toBe(2);
    expect(result.report.counts.unresolvedProps).toBeGreaterThanOrEqual(2);
    expect(result.report.entries.map((entry) => entry.kind)).toContain('spread-props');
  });

  it('binds hook arguments to parameters and returns to receivers', async () => {
    const result = await run(files);
    const binds = find(result, 'binds-hook');
    expect(binds).toHaveLength(3);
    const targets = binds.map((edge) => edge.target.itemId);
    expect(targets).toContain(itemId(result, 'useCart', 'initial'));
    expect(targets).toContain(itemId(result, 'Page', 'items'));
    expect(targets).toContain(itemId(result, 'Page', 'add'));
  });

  it('feeds a context value into the item that consumes it', async () => {
    const result = await run(files);
    const consumes = find(result, 'consumes');
    expect(consumes).toHaveLength(1);
    expect(consumes[0]?.source.itemId).toBe(itemId(result, 'Theme', 'value'));
    expect(consumes[0]?.target.itemId).toBe(itemId(result, 'Page', 'theme'));
  });
});
