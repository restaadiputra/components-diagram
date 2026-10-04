import { describe, expect, it } from 'vitest';
import type { DiagramNode } from '../../domain/diagram';
import { named, run } from './testing/run-analyzer';

const source = `
  import { useEffect, useMemo, useState } from 'react';
  export function Page({ title }: { title: string }) {
    const [count, setCount] = useState(0);
    const doubled = useMemo(() => count * 2, [count]);
    const label = title + count;
    const bump = () => setCount(count + 1);
    useEffect(() => { document.title = label; }, [label]);
    return <div />;
  }
  export function useBox() {
    const [value, setValue] = useState(0);
    return { value };
  }
`;

function linksOf(node: DiagramNode | undefined) {
  const name = (id: string) => node?.items.find((item) => item.id === id)?.name ?? '?';
  return (node?.links ?? [])
    .map((link) => `${name(link.fromItemId)} ${link.relation} ${name(link.toItemId)}`)
    .sort();
}

describe('linkInternals', () => {
  it('links setters, reads and dependency arrays', async () => {
    const result = await run({ 'src/a.tsx': source });
    expect(linksOf(named(result, 'Page'))).toEqual([
      'bump reads count',
      'bump sets count',
      'doubled depends-on count',
      'effect@8 depends-on label',
      'label reads count',
      'label reads title',
    ]);
  });

  it('does not mistake a property name for an item (document.title is not the title prop)', async () => {
    const result = await run({ 'src/a.tsx': source });
    expect(linksOf(named(result, 'Page'))).not.toContain('effect@8 reads title');
  });

  it('lets a hook return read the item it exposes', async () => {
    const result = await run({ 'src/a.tsx': source });
    expect(linksOf(named(result, 'useBox'))).toEqual(['value reads value']);
  });
});
