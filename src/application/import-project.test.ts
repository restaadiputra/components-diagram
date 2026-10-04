import { describe, expect, it } from 'vitest';
import type { ProjectAnalyzer } from './ports/project-analyzer';
import { importProject } from './import-project';
import { node } from '../domain/testing/fixtures';

const emptyReport = {
  entries: [],
  counts: { nodes: 0, items: 0, edges: 0, tracedProps: 0, unresolvedProps: 0 },
};

const deps = (analyze: ProjectAnalyzer) => ({
  analyze,
  newId: () => 'd1',
  now: () => '2026-01-01T00:00:00.000Z',
});

describe('importProject', () => {
  it('wraps the analyzer output in a named diagram', async () => {
    const analyze: ProjectAnalyzer = () =>
      Promise.resolve({ nodes: [node('A', 'component')], edges: [], report: emptyReport });
    const imported = await importProject({}, deps(analyze), 'Shop');
    expect(imported.diagram).toMatchObject({
      id: 'd1',
      name: 'Shop',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(imported.diagram.nodes).toHaveLength(1);
    expect(imported.dropped).toBe(0);
  });

  it('defaults the name and drops what the model would not accept', async () => {
    const analyze: ProjectAnalyzer = () =>
      Promise.resolve({
        nodes: [node('A', 'component')],
        edges: [{ id: 'e1', kind: 'renders', source: { nodeId: 'A' }, target: { nodeId: 'gone' } }],
        report: emptyReport,
      });
    const imported = await importProject({}, deps(analyze));
    expect(imported.diagram.name).toBe('Imported project');
    expect(imported.diagram.edges).toEqual([]);
    expect(imported.dropped).toBe(1);
  });
});
