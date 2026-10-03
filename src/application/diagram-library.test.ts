import { describe, expect, it } from 'vitest';
import { createInMemoryDiagramRepository } from '../adapters/storage/in-memory-diagram-repository';
import { createDiagram } from '../domain/diagram';
import { createDiagramLibrary } from './diagram-library';

function setup() {
  const repository = createInMemoryDiagramRepository();
  let remembered: string | null = null;
  let counter = 0;
  const library = createDiagramLibrary({
    repository,
    lastOpened: {
      get: () => remembered,
      set: (id) => {
        remembered = id;
      },
    },
    newId: () => {
      counter += 1;
      return `id-${String(counter)}`;
    },
    now: () => '2026-10-03T12:00:00.000Z',
  });
  return { repository, library, lastOpened: () => remembered };
}

describe('diagram library', () => {
  it('creates and saves a new diagram when nothing is stored', async () => {
    const { library, repository } = setup();
    const { diagram } = await library.openInitial();
    expect(diagram.name).toBe('Untitled diagram');
    expect((await repository.list()).map((summary) => summary.id)).toEqual([diagram.id]);
  });

  it('reopens the last opened diagram', async () => {
    const { library, repository } = setup();
    await repository.save(createDiagram('a', 'A', '2026-01-01T00:00:00.000Z'));
    await repository.save(createDiagram('b', 'B', '2026-01-02T00:00:00.000Z'));
    library.remember('a');
    expect((await library.openInitial()).diagram.id).toBe('a');
  });

  it('falls back to the most recent diagram when the last opened one is gone', async () => {
    const { library, repository } = setup();
    await repository.save(createDiagram('a', 'A', '2026-01-01T00:00:00.000Z'));
    await repository.save(createDiagram('b', 'B', '2026-01-02T00:00:00.000Z'));
    library.remember('deleted');
    expect((await library.openInitial()).diagram.id).toBe('b');
  });

  it('duplicates under a new id with "copy" in the name', async () => {
    const { library, repository } = setup();
    await repository.save(createDiagram('a', 'Checkout', '2026-01-01T00:00:00.000Z'));
    const copy = await library.duplicate('a');
    expect(copy).toMatchObject({ id: 'id-1', name: 'Checkout copy' });
    expect(await repository.list()).toHaveLength(2);
  });

  it('adopts an imported diagram under a new id so nothing is overwritten', async () => {
    const { library, repository } = setup();
    const original = createDiagram('a', 'Checkout', '2026-01-01T00:00:00.000Z');
    await repository.save(original);
    const adopted = await library.adopt(original);
    expect(adopted.id).toBe('id-1');
    expect(await repository.list()).toHaveLength(2);
  });

  it('renames a stored diagram', async () => {
    const { library, repository } = setup();
    await repository.save(createDiagram('a', 'Old', '2026-01-01T00:00:00.000Z'));
    await library.rename('a', 'New');
    expect((await repository.load('a'))?.diagram.name).toBe('New');
  });

  it('still returns a new diagram when the stored list cannot be read', async () => {
    const repository = {
      ...createInMemoryDiagramRepository(),
      list: () => Promise.reject(new Error('unreadable')),
    };
    const library = createDiagramLibrary({
      repository,
      lastOpened: { get: () => null, set: () => undefined },
      newId: () => 'fresh',
      now: () => '2026-10-03T12:00:00.000Z',
    });
    const { diagram } = await library.openInitial();
    expect(diagram).toMatchObject({ id: 'fresh', name: 'Untitled diagram' });
  });

  it('still returns a new diagram when it cannot be stored', async () => {
    const repository = {
      ...createInMemoryDiagramRepository(),
      save: () => Promise.reject(new Error('quota')),
    };
    const library = createDiagramLibrary({
      repository,
      lastOpened: { get: () => null, set: () => undefined },
      newId: () => 'fresh',
      now: () => '2026-10-03T12:00:00.000Z',
    });
    const { diagram } = await library.openInitial();
    expect(diagram.id).toBe('fresh');
  });
});
