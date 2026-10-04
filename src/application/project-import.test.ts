import { describe, expect, it, vi } from 'vitest';
import { createDiagramStore } from './diagram-store';
import { createProjectImport, type SwitchTo } from './project-import';
import { createDiagram, type Diagram } from '../domain/diagram';
import type { DiagramLibrary } from './diagram-library';
import type { ProjectAnalyzer } from './ports/project-analyzer';
import type { PickedProject, ProjectSource } from './ports/project-source';

const NOW = '2026-01-01T00:00:00.000Z';
const emptyReport = {
  entries: [],
  counts: { nodes: 1, items: 0, edges: 0, tracedProps: 0, unresolvedProps: 0 },
};
const picked = (over: Partial<PickedProject> = {}): PickedProject => ({
  name: 'shop',
  files: { 'a.tsx': 'x' },
  skipped: { tooLarge: 0, tooMany: false },
  ...over,
});

interface SetupOptions {
  pick?: PickedProject | undefined | Error;
  analyze?: ProjectAnalyzer;
  switchOk?: boolean;
}

function setup(options: SetupOptions = {}) {
  const store = createDiagramStore(createDiagram('open', 'Open', NOW), () => NOW);
  const adopt = vi.fn((diagram: Diagram) => Promise.resolve(diagram));
  // Only `adopt` is used by the import flow.
  const library = { adopt } as unknown as DiagramLibrary;
  const pick: ProjectSource['pick'] = () =>
    options.pick instanceof Error
      ? Promise.reject(options.pick)
      : Promise.resolve('pick' in options ? options.pick : picked());
  const analyzer: ProjectAnalyzer =
    options.analyze ?? (() => Promise.resolve({ nodes: [], edges: [], report: emptyReport }));
  const switchTo: SwitchTo = async (fetch) => {
    const loaded = await fetch();
    if (options.switchOk !== false && loaded) store.getState().load(loaded.diagram);
  };
  const flow = createProjectImport(
    {
      store,
      library,
      projectSource: { supported: true, pick },
      analyzer,
      layout: (nodes) => nodes,
      newId: () => 'new1',
      now: () => NOW,
    },
    switchTo,
  );
  return { store, flow, adopt };
}

describe('project import', () => {
  it('imports, opens the new diagram and shows a summary', async () => {
    const { store, flow, adopt } = setup();
    await flow.importProject();
    expect(adopt).toHaveBeenCalledOnce();
    expect(store.getState().diagram.id).toBe('new1');
    expect(store.getState().importSummary?.projectName).toBe('shop');
    expect(store.getState().importStatus).toEqual({ phase: 'idle' });
  });

  it('ends silently when the user cancels the picker', async () => {
    const { store, flow } = setup({ pick: undefined });
    await flow.importProject();
    expect(store.getState().notice).toBeNull();
    expect(store.getState().importSummary).toBeNull();
  });

  it.each([
    [
      { skipped: { tooLarge: 0, tooMany: true } },
      'This project has more than 2,000 source files. Pick a subfolder.',
    ],
    [{ files: {} }, 'No TypeScript or JavaScript files were found.'],
  ])('refuses a project that cannot be imported (%#)', async (over, notice) => {
    const { store, flow } = setup({ pick: picked(over) });
    await flow.importProject();
    expect(store.getState().notice).toBe(notice);
    expect(store.getState().diagram.id).toBe('open');
  });

  it('shows the picker error message', async () => {
    const { store, flow } = setup({ pick: new Error('The folder could not be read.') });
    await flow.importProject();
    expect(store.getState().notice).toBe('The folder could not be read.');
  });

  it('reports an analyzer failure and leaves the open diagram alone', async () => {
    const { store, flow } = setup({ analyze: () => Promise.reject(new Error('boom')) });
    await flow.importProject();
    expect(store.getState().notice).toBe('The project could not be analyzed.');
    expect(store.getState().diagram.id).toBe('open');
  });

  it('stays quiet when the analysis is cancelled', async () => {
    const analyze: ProjectAnalyzer = () =>
      Promise.reject(new DOMException('cancelled', 'AbortError'));
    const { store, flow } = setup({ analyze });
    await flow.importProject();
    expect(store.getState().notice).toBeNull();
  });

  it('shows no summary when the switch was refused', async () => {
    const { store, flow } = setup({ switchOk: false });
    await flow.importProject();
    expect(store.getState().importSummary).toBeNull();
  });

  it('ignores a second import while one is running', async () => {
    let release: () => void = () => undefined;
    const analyze: ProjectAnalyzer = () =>
      new Promise((resolve) => {
        release = () => {
          resolve({ nodes: [], edges: [], report: emptyReport });
        };
      });
    const { flow, adopt } = setup({ analyze });
    const first = flow.importProject();
    await flow.importProject();
    await Promise.resolve();
    release();
    await first;
    expect(adopt).toHaveBeenCalledOnce();
  });
});
