import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiagram, type Diagram } from '../domain/diagram';
import { startAutosave } from './autosave';
import { renameDiagram } from './commands/rename-diagram';
import { createDiagramStore } from './diagram-store';
import {
  SaveConflictError,
  type DiagramRepository,
  type SaveExpectation,
} from './ports/diagram-repository';

const NOW = '2026-10-03T12:00:00.000Z';

function setup(save?: DiagramRepository['save']) {
  const saved: Diagram[] = [];
  const repository: DiagramRepository = {
    save:
      save ??
      ((diagram) => {
        saved.push(diagram);
        return Promise.resolve();
      }),
    load: () => Promise.resolve(undefined),
    list: () => Promise.resolve([]),
    delete: () => Promise.resolve(),
  };
  const store = createDiagramStore(createDiagram('d1', 'Test', NOW), () => NOW);
  const autosave = startAutosave(store, repository);
  const rename = (name: string) => {
    store.getState().apply((diagram) => renameDiagram(diagram, name));
  };
  return { store, autosave, saved, rename };
}

/** A repository whose writes finish only when the test says so. */
function manualWrites() {
  const waiting: (() => void)[] = [];
  const written: Diagram[] = [];
  let active = 0;
  let maxActive = 0;
  const save: DiagramRepository['save'] = (diagram) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    return new Promise<void>((resolve) => {
      waiting.push(() => {
        active -= 1;
        written.push(diagram);
        resolve();
      });
    });
  };
  return {
    save,
    written,
    release: () => waiting.shift()?.(),
    maxActive: () => maxActive,
  };
}

describe('autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves once, 800 ms after the last change', async () => {
    const { store, saved, rename } = setup();
    rename('A');
    await vi.advanceTimersByTimeAsync(500);
    rename('B');
    expect(store.getState().saveStatus).toBe('saving');
    await vi.advanceTimersByTimeAsync(799);
    expect(saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(saved.map((diagram) => diagram.name)).toEqual(['B']);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('flushes a pending save immediately and does nothing when idle', async () => {
    const { autosave, saved, rename } = setup();
    expect(await autosave.flush()).toBe(true);
    expect(saved).toEqual([]);
    rename('A');
    expect(await autosave.flush()).toBe(true);
    expect(saved).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toHaveLength(1);
  });

  it('reports a failed save and keeps the diagram in memory', async () => {
    const { store, rename } = setup(() => Promise.reject(new Error('quota')));
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveStatus).toBe('failed');
    expect(store.getState().diagram.name).toBe('A');
  });

  it('flush resolves false after a failed save and retries until it succeeds', async () => {
    let failing = true;
    const saved: Diagram[] = [];
    const { store, autosave, rename } = setup((diagram) => {
      if (failing) return Promise.reject(new Error('quota'));
      saved.push(diagram);
      return Promise.resolve();
    });
    rename('A');
    expect(await autosave.flush()).toBe(false);
    expect(store.getState().saveStatus).toBe('failed');
    failing = false;
    expect(await autosave.flush()).toBe(true);
    expect(saved.map((diagram) => diagram.name)).toEqual(['A']);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('saves a change made during a write afterwards, never two writes at once', async () => {
    const writes = manualWrites();
    const { store, rename } = setup(writes.save);
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    rename('B');
    writes.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getState().saveStatus).toBe('saving');
    await vi.advanceTimersByTimeAsync(800);
    writes.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(writes.written.map((diagram) => diagram.name)).toEqual(['A', 'B']);
    expect(writes.maxActive()).toBe(1);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('flush waits for a write that is already running', async () => {
    const writes = manualWrites();
    const { autosave, rename } = setup(writes.save);
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    let settled = false;
    const flushed = autosave.flush().then((result) => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    writes.release();
    expect(await flushed).toBe(true);
    expect(writes.written).toHaveLength(1);
  });

  it('drops a pending save when suspended', async () => {
    const { autosave, saved, rename } = setup();
    rename('A');
    await autosave.suspend();
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toEqual([]);
  });

  it('ignores changes while suspended and saves again after resume', async () => {
    const { store, autosave, saved, rename } = setup();
    await autosave.suspend();
    rename('A');
    expect(store.getState().saveStatus).toBe('saved');
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toEqual([]);
    autosave.resume();
    rename('B');
    await vi.advanceTimersByTimeAsync(800);
    expect(saved.map((diagram) => diagram.name)).toEqual(['B']);
  });

  it('does not write while suspended and reports the change as unsaved', async () => {
    const { autosave, saved, rename } = setup();
    await autosave.suspend();
    rename('A');
    expect(await autosave.flush()).toBe(false);
    expect(saved).toEqual([]);
    autosave.resume();
    await vi.advanceTimersByTimeAsync(800);
    expect(saved.map((diagram) => diagram.name)).toEqual(['A']);
  });

  it('does not save for selection changes', async () => {
    const { store, saved } = setup();
    store.getState().select(null);
    store.getState().setNotice('hello');
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toEqual([]);
  });
});

describe('autosave against a shared store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Each edit gets a new updatedAt, like the real clock. */
  function tabSetup(options: { baseline?: string | null; conflict?: () => boolean } = {}) {
    let tick = 0;
    const clock = () => `2026-10-03T12:00:0${String(++tick)}.000Z`;
    const calls: { name: string; expected: SaveExpectation | undefined }[] = [];
    const repository: DiagramRepository = {
      save: (diagram, expected) => {
        calls.push({ name: diagram.name, expected });
        if (options.conflict?.()) return Promise.reject(new SaveConflictError());
        return Promise.resolve();
      },
      load: () => Promise.resolve(undefined),
      list: () => Promise.resolve([]),
      delete: () => Promise.resolve(),
    };
    const opened = createDiagram('d1', 'Test', NOW);
    const store = createDiagramStore(opened, clock);
    const autosave = startAutosave(
      store,
      repository,
      options.baseline === undefined ? {} : { baseline: options.baseline },
    );
    const rename = (name: string) => {
      store.getState().apply((diagram) => renameDiagram(diagram, name));
    };
    return { store, autosave, calls, rename, opened };
  }

  it('expects the loaded updatedAt on the first save, then the one it wrote', async () => {
    const { store, calls, rename, opened } = tabSetup();
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    const firstWritten = store.getState().diagram.updatedAt;
    rename('B');
    await vi.advanceTimersByTimeAsync(800);
    expect(calls.map((call) => call.expected)).toEqual([
      { updatedAt: opened.updatedAt },
      { updatedAt: firstWritten },
    ]);
  });

  it('expects no record for a diagram that was never stored', async () => {
    const { calls, rename } = tabSetup({ baseline: null });
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    expect(calls[0]?.expected).toEqual({ updatedAt: null });
  });

  it('stops at a conflict: status, kept diagram, flush false, no further writes', async () => {
    const { store, autosave, calls, rename } = tabSetup({ conflict: () => true });
    rename('A');
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveStatus).toBe('conflict');
    expect(store.getState().diagram.name).toBe('A');
    expect(await autosave.flush()).toBe(false);

    rename('B');
    expect(store.getState().saveStatus).toBe('conflict');
    await vi.advanceTimersByTimeAsync(800);
    expect(await autosave.flush()).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('uses the opened diagram updatedAt as the baseline after switching diagrams', async () => {
    const { store, calls, rename } = tabSetup();
    const other = createDiagram('d2', 'Other', '2026-02-01T00:00:00.000Z');
    store.getState().load(other);
    await vi.advanceTimersByTimeAsync(800);
    calls.length = 0;
    rename('Edited');
    await vi.advanceTimersByTimeAsync(800);
    expect(calls[0]?.expected).toEqual({ updatedAt: '2026-02-01T00:00:00.000Z' });
  });

  it('lets a conflicted tab save again once another diagram is open', async () => {
    let conflict = true;
    const { store, autosave, calls, rename } = tabSetup({ conflict: () => conflict });
    rename('A');
    expect(await autosave.flush()).toBe(false);
    conflict = false;
    store.getState().load(createDiagram('d2', 'Other', '2026-02-01T00:00:00.000Z'));
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveStatus).toBe('saved');
    expect(calls.at(-1)?.name).toBe('Other');
  });
});
