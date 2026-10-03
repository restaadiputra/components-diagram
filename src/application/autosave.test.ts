import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiagram, type Diagram } from '../domain/diagram';
import { startAutosave } from './autosave';
import { renameDiagram } from './commands/rename-diagram';
import { createDiagramStore } from './diagram-store';
import type { DiagramRepository } from './ports/diagram-repository';

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
