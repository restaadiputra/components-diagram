import { describe, expect, it } from 'vitest';
import { run } from './testing/run-analyzer';

describe('analyzeProject', () => {
  it('returns an empty, valid result for no files', async () => {
    const result = await run({});
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.report.entries).toEqual([]);
  });

  it('refuses a project above the file limit', async () => {
    const files = { 'a.ts': 'export {}', 'b.ts': 'export {}', 'c.ts': 'export {}' };
    const result = await run(files, { maxFiles: 2 });
    expect(result.nodes).toEqual([]);
    expect(result.report.entries).toEqual([{ kind: 'file-limit', file: '', line: 0 }]);
  });

  it('reports a syntax error with its file and line, and keeps going', async () => {
    const result = await run({ 'src/bad.ts': 'const a = ;\n', 'src/ok.ts': 'export const b = 1;' });
    expect(result.report.entries).toContainEqual({
      kind: 'syntax-error',
      file: 'src/bad.ts',
      line: 1,
    });
  });

  it('reports an unresolved relative import but not a package import', async () => {
    const result = await run({
      'src/a.ts':
        "import { x } from './missing';\nimport { useState } from 'react';\nexport const y = x;",
    });
    const kinds = result.report.entries.map((entry) => entry.kind);
    expect(kinds).toEqual(['unresolved-import']);
  });

  it('ignores files that are not source code', async () => {
    const result = await run({ 'README.md': '# hi', 'a.css': 'a{}' }, { maxFiles: 1 });
    expect(result.report.entries).toEqual([]);
  });
});
