import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { run } from './testing/run-analyzer';

function collect(dir: string, into: Record<string, string>): Record<string, string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path, into);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.'))
      into[path.replaceAll('\\', '/')] = readFileSync(path, 'utf8');
  }
  return into;
}

describe('analyzer smoke test', () => {
  it('analyzes src/ui without throwing and finds known components', async () => {
    const result = await run(collect('src/ui', {}));
    const names = result.nodes.map((node) => node.name);
    expect(names).toEqual(expect.arrayContaining(['App', 'Inspector', 'NodeHeader']));
    expect(result.edges.length).toBeGreaterThan(0);
  });
});
