import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryDiagramRepository } from '../adapters/storage/in-memory-diagram-repository';
import { jsonDiagramCodec } from '../adapters/storage/json-diagram-codec';
import { createDiagram } from '../domain/diagram';
import { edge, node } from '../domain/testing/fixtures';
import { startAutosave, type Autosave } from './autosave';
import { renameDiagram } from './commands/rename-diagram';
import { createDiagramLibrary } from './diagram-library';
import { createSession, fileNameFor } from './diagram-session';
import { createDiagramStore } from './diagram-store';
import type { DiagramRepository } from './ports/diagram-repository';

const NOW = '2026-10-03T12:00:00.000Z';

async function setup() {
  const repository = createInMemoryDiagramRepository();
  const current = createDiagram('d1', 'Current', '2026-01-02T00:00:00.000Z');
  const other = createDiagram('d2', 'Other', '2026-01-01T00:00:00.000Z');
  await repository.save(current);
  await repository.save(other);

  let counter = 0;
  const library = createDiagramLibrary({
    repository,
    lastOpened: { get: () => null, set: () => undefined },
    newId: () => {
      counter += 1;
      return `new-${String(counter)}`;
    },
    now: () => NOW,
  });
  const store = createDiagramStore(current, () => NOW);
  const calls: string[] = [];
  const autosave: Autosave = {
    flush: () => {
      calls.push('flush');
      return Promise.resolve(true);
    },
    suspend: () => {
      calls.push('suspend');
      return Promise.resolve();
    },
    resume: () => calls.push('resume'),
    stop: () => undefined,
  };
  const files = {
    saved: [] as { fileName: string; text: string }[],
    next: undefined as string | undefined,
    failure: undefined as Error | undefined,
  };
  const session = createSession({
    store,
    library,
    autosave,
    codec: jsonDiagramCodec,
    files: {
      saveText: (fileName, text) => files.saved.push({ fileName, text }),
      openText: () => (files.failure ? Promise.reject(files.failure) : Promise.resolve(files.next)),
    },
  });
  return { repository, store, session, calls, files, state: () => store.getState() };
}

describe('diagram session', () => {
  it('flushes pending changes, then opens another diagram', async () => {
    const { session, state, calls } = await setup();
    await session.open('d2');
    // Once before fetching the target and once before the switch, so no edit slips in between.
    expect(calls).toEqual(['flush', 'flush']);
    expect(state().diagram.id).toBe('d2');
  });

  it('tells the user when a diagram no longer exists', async () => {
    const { session, state } = await setup();
    await session.open('ghost');
    expect(state().diagram.id).toBe('d1');
    expect(state().notice).toBe('That diagram no longer exists.');
  });

  it('reports references dropped while opening', async () => {
    const { session, state, repository } = await setup();
    await repository.save({
      ...createDiagram('d3', 'Broken', NOW),
      nodes: [node('Page', 'component')],
      edges: [edge('e1', 'renders', 'Page->Ghost')],
    });
    await session.open('d3');
    expect(state().notice).toBe('1 broken connection was removed while opening this diagram.');
  });

  it('creates and opens a new diagram', async () => {
    const { session, state, repository } = await setup();
    await session.createNew();
    expect(state().diagram.id).toBe('new-1');
    expect(await repository.list()).toHaveLength(3);
  });

  it('suspends autosave before deleting the open diagram and resumes after', async () => {
    const { session, state, calls, repository } = await setup();
    await session.remove('d1');
    expect(calls).toEqual(['suspend', 'resume']);
    expect(state().diagram.id).toBe('d2');
    expect((await repository.list()).map((summary) => summary.id)).toEqual(['d2']);
  });

  it('opens a new diagram after the last one is deleted', async () => {
    const { session, state } = await setup();
    await session.remove('d2');
    await session.remove('d1');
    expect(state().diagram.id).toBe('new-1');
  });

  it('renames the open diagram through the store and others through the library', async () => {
    const { session, state, repository } = await setup();
    await session.rename('d1', 'Renamed');
    expect(state().diagram.name).toBe('Renamed');
    await session.rename('d2', 'Also renamed');
    expect((await repository.load('d2'))?.diagram.name).toBe('Also renamed');
  });

  it('exports the open diagram as <name>.diagram.json', async () => {
    const { session, files, state } = await setup();
    session.exportCurrent();
    expect(files.saved[0]?.fileName).toBe('Current.diagram.json');
    expect(JSON.parse(files.saved[0]?.text ?? '')).toEqual(state().diagram);
  });

  it('imports a file as a new diagram', async () => {
    const { session, files, state, repository } = await setup();
    files.next = jsonDiagramCodec.serialize(createDiagram('d1', 'Imported', NOW));
    await session.importFile();
    expect(state().diagram).toMatchObject({ id: 'new-1', name: 'Imported' });
    expect(await repository.list()).toHaveLength(3);
  });

  it('rejects an invalid file with a notice and changes nothing', async () => {
    const { session, files, state, repository } = await setup();
    files.next = 'not json';
    await session.importFile();
    expect(state().notice).toBe('This file is not valid JSON.');
    expect(state().diagram.id).toBe('d1');
    expect(await repository.list()).toHaveLength(2);
  });

  it('shows a notice and changes nothing when the file cannot be read', async () => {
    const { session, files, state, repository } = await setup();
    files.failure = new Error('The file could not be read.');
    await session.importFile();
    expect(state().notice).toBe('The file could not be read.');
    expect(state().diagram.id).toBe('d1');
    expect(await repository.list()).toHaveLength(2);
  });

  it('does nothing when the file picker is cancelled', async () => {
    const { session, state } = await setup();
    await session.importFile();
    expect(state().notice).toBeNull();
  });
});

describe('fileNameFor', () => {
  it('builds a safe file name', () => {
    expect(fileNameFor('Checkout flow')).toBe('Checkout-flow.diagram.json');
    expect(fileNameFor(' a/b:c ')).toBe('a-b-c.diagram.json');
    expect(fileNameFor('???')).toBe('diagram.diagram.json');
  });
});

const UNSAVED =
  'This diagram could not be saved, so it is still open. Export it to keep your work.';

/** The real autosave over an in-memory repository whose calls the test can override. */
async function setupLive() {
  const real = createInMemoryDiagramRepository();
  const hooks: DiagramRepository = { ...real };
  const repository: DiagramRepository = {
    save: (diagram) => hooks.save(diagram),
    load: (id) => hooks.load(id),
    list: () => hooks.list(),
    delete: (id) => hooks.delete(id),
  };
  const current = createDiagram('d1', 'Current', '2026-01-02T00:00:00.000Z');
  await real.save(current);
  await real.save(createDiagram('d2', 'Other', '2026-01-01T00:00:00.000Z'));

  let counter = 0;
  const library = createDiagramLibrary({
    repository,
    lastOpened: { get: () => null, set: () => undefined },
    newId: () => {
      counter += 1;
      return `new-${String(counter)}`;
    },
    now: () => NOW,
  });
  const store = createDiagramStore(current, () => NOW);
  const autosave = startAutosave(store, repository);
  const files = { next: undefined as string | undefined };
  const session = createSession({
    store,
    library,
    autosave,
    codec: jsonDiagramCodec,
    files: { saveText: () => undefined, openText: () => Promise.resolve(files.next) },
  });
  const edit = (name: string) => {
    store.getState().apply((diagram) => renameDiagram(diagram, name));
  };
  const ids = async () => (await real.list()).map((summary) => summary.id).sort();
  const rejectAll = (hook: 'save' | 'load' | 'list' | 'delete') => {
    Object.assign(hooks, { [hook]: () => Promise.reject(new Error('storage failed')) });
  };
  return { real, hooks, session, files, edit, ids, rejectAll, state: () => store.getState() };
}

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

describe('diagram session with real autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps an unsaved diagram open instead of switching away from it', async () => {
    const { session, state, edit, rejectAll, hooks } = await setupLive();
    edit('Edited');
    rejectAll('save');
    await vi.advanceTimersByTimeAsync(800);
    expect(state().saveStatus).toBe('failed');
    const load = vi.spyOn(hooks, 'load');
    await session.open('d2');
    expect(state().diagram).toMatchObject({ id: 'd1', name: 'Edited' });
    expect(state().notice).toBe(UNSAVED);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not bring back a deleted diagram that had a pending edit', async () => {
    const { session, edit, ids, state } = await setupLive();
    edit('Edited');
    await session.remove('d1');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await ids()).toEqual(['d2']);
    expect(state().diagram.id).toBe('d2');
  });

  it('does not bring back a deleted diagram whose save was in flight', async () => {
    const { session, edit, ids, hooks, real } = await setupLive();
    const release = gate();
    hooks.save = async (diagram) => {
      await release.opened;
      await real.save(diagram);
    };
    edit('Edited');
    await vi.advanceTimersByTimeAsync(800);
    const removing = session.remove('d1');
    release.open();
    await removing;
    await vi.advanceTimersByTimeAsync(5000);
    expect(await ids()).toEqual(['d2']);
  });

  it('writes an edit made while a new diagram is being created to the old record', async () => {
    const { session, edit, hooks, real, state } = await setupLive();
    const release = gate();
    hooks.save = async (diagram) => {
      if (diagram.id === 'new-1') await release.opened;
      await real.save(diagram);
    };
    const creating = session.createNew();
    await vi.advanceTimersByTimeAsync(0);
    edit('Edited meanwhile');
    release.open();
    await creating;
    expect(state().diagram.id).toBe('new-1');
    expect((await real.load('d1'))?.diagram.name).toBe('Edited meanwhile');
  });

  it('does not save the deleted diagram when edits arrive while it is being removed', async () => {
    const { session, edit, ids, hooks, real, state } = await setupLive();
    const deleted = gate();
    const listed = gate();
    hooks.delete = async (id) => {
      await deleted.opened;
      await real.delete(id);
    };
    hooks.list = async () => {
      await listed.opened;
      return real.list();
    };
    const removing = session.remove('d1');
    await vi.advanceTimersByTimeAsync(0);
    edit('Edited during delete');
    deleted.open();
    await vi.advanceTimersByTimeAsync(0);
    edit('Edited while looking for a replacement');
    await vi.advanceTimersByTimeAsync(1000);
    listed.open();
    await removing;
    await vi.advanceTimersByTimeAsync(5000);
    expect(await ids()).toEqual(['d2']);
    expect(state().diagram.id).toBe('d2');
  });

  it('opens a new diagram when the replacement cannot be read after a delete', async () => {
    const { session, ids, hooks, state } = await setupLive();
    hooks.load = () => Promise.reject(new Error('unreadable'));
    await session.remove('d1');
    await vi.advanceTimersByTimeAsync(5000);
    expect(state().diagram.id).toBe('new-1');
    expect(await ids()).toEqual(['d2', 'new-1']);
  });

  it('shows the message of an error thrown while opening', async () => {
    const { session, state, hooks } = await setupLive();
    hooks.load = () => Promise.reject(new Error('Record is unreadable'));
    await session.open('d2');
    expect(state().notice).toBe('Record is unreadable');
    expect(state().diagram.id).toBe('d1');
  });

  it('uses a generic notice when something other than an error is thrown while opening', async () => {
    const { session, state, hooks } = await setupLive();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error rejection is exactly what is under test
    hooks.load = () => Promise.reject('unreadable');
    await session.open('d2');
    expect(state().notice).toBe('The diagram could not be opened.');
    expect(state().diagram.id).toBe('d1');
  });

  describe('when the repository rejects', () => {
    it('reports a failed createNew', async () => {
      const { session, state, rejectAll } = await setupLive();
      rejectAll('save');
      await session.createNew();
      expect(state().notice).toBe('The new diagram could not be created.');
      expect(state().diagram.id).toBe('d1');
    });

    it('reports a failed duplicate', async () => {
      const { session, state, rejectAll } = await setupLive();
      rejectAll('save');
      await session.duplicate('d2');
      expect(state().notice).toBe('The diagram could not be duplicated.');
      expect(state().diagram.id).toBe('d1');
    });

    it('reports a failed rename of another diagram', async () => {
      const { session, state, rejectAll } = await setupLive();
      rejectAll('load');
      await session.rename('d2', 'New name');
      expect(state().notice).toBe('The diagram could not be renamed.');
      expect(state().diagram.name).toBe('Current');
    });

    it('reports a failed delete and keeps the open diagram saved', async () => {
      const { session, state, rejectAll, hooks, real, edit } = await setupLive();
      edit('Edited');
      rejectAll('delete');
      await session.remove('d1');
      expect(state().notice).toBe('The diagram could not be deleted.');
      expect(state().diagram).toMatchObject({ id: 'd1', name: 'Edited' });
      hooks.delete = real.delete;
      await vi.advanceTimersByTimeAsync(800);
      expect((await real.load('d1'))?.diagram.name).toBe('Edited');
      expect(state().saveStatus).toBe('saved');
    });

    it('reports a failed delete of another diagram', async () => {
      const { session, state, rejectAll } = await setupLive();
      rejectAll('delete');
      await session.remove('d2');
      expect(state().notice).toBe('The diagram could not be deleted.');
      expect(state().diagram.id).toBe('d1');
    });

    it('reports a failed import', async () => {
      const { session, state, files, rejectAll } = await setupLive();
      files.next = jsonDiagramCodec.serialize(createDiagram('x', 'Imported', NOW));
      rejectAll('save');
      await session.importFile();
      expect(state().notice).toBe('The file could not be imported.');
      expect(state().diagram.id).toBe('d1');
    });
  });
});
