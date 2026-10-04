import { describe, expect, it } from 'vitest';
import { edgeKinds, named, run } from './testing/run-analyzer';

const files = {
  'src/theme.ts': `import { createContext } from 'react'; export const Theme = createContext('x');`,
  'src/use-thing.ts': `export function useThing() { return 1; }`,
  'src/list.tsx': `export function List() { return <ul />; }`,
  'src/page.tsx': `
    import { Theme } from './theme';
    import { useThing } from './use-thing';
    import { List } from './list';
    export function Page({ Slot }: { Slot: any }) {
      useThing();
      return <Theme.Provider value="dark"><List /><Slot /></Theme.Provider>;
    }
  `,
};

describe('connectStructure', () => {
  it('adds renders, provides and uses-hook edges at node level', async () => {
    const result = await run(files);
    expect(edgeKinds(result).sort()).toEqual(['provides', 'renders', 'uses-hook']);
    const page = named(result, 'Page')?.id;
    const list = named(result, 'List')?.id;
    const renders = result.edges.find((edge) => edge.kind === 'renders');
    expect(renders?.source).toEqual({ nodeId: page });
    expect(renders?.target).toEqual({ nodeId: list });
  });

  it('does not duplicate an edge for a second JSX use', async () => {
    const result = await run({
      ...files,
      'src/page.tsx': files['src/page.tsx'].replace('<List />', '<List /><List />'),
    });
    expect(edgeKinds(result).filter((kind) => kind === 'renders')).toHaveLength(1);
  });

  it('reports a component that is chosen at runtime', async () => {
    const result = await run(files);
    expect(result.report.entries.map((entry) => entry.kind)).toContain('dynamic-component');
  });
});
