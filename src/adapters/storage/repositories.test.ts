import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDiagram, type Diagram } from '../../domain/diagram';
import { edge, item, node } from '../../domain/testing/fixtures';
import { SaveConflictError } from '../../application/ports/diagram-repository';
import { createInMemoryDiagramRepository } from './in-memory-diagram-repository';
import { createIndexedDbDiagramRepository } from './indexed-db-diagram-repository';

function diagram(id: string, updatedAt: string): Diagram {
  return { ...createDiagram(id, `Diagram ${id}`, '2026-01-01T00:00:00.000Z'), updatedAt };
}

// Both adapters must behave identically, so they share one suite.
describe.each([
  ['in-memory', () => createInMemoryDiagramRepository()],
  ['indexed-db', () => createIndexedDbDiagramRepository(new IDBFactory())],
])('%s diagram repository', (_name, create) => {
  it('loads what was saved', async () => {
    const repository = create();
    const saved = {
      ...diagram('a', '2026-01-02T00:00:00.000Z'),
      nodes: [node('Page', 'component')],
    };
    await repository.save(saved);
    expect(await repository.load('a')).toEqual({ diagram: saved, droppedReferences: 0 });
  });

  it('resolves to undefined for an unknown id', async () => {
    expect(await create().load('ghost')).toBeUndefined();
  });

  it('overwrites a diagram with the same id', async () => {
    const repository = create();
    await repository.save(diagram('a', '2026-01-02T00:00:00.000Z'));
    await repository.save({ ...diagram('a', '2026-01-03T00:00:00.000Z'), name: 'Renamed' });
    expect(await repository.list()).toEqual([
      { id: 'a', name: 'Renamed', updatedAt: '2026-01-03T00:00:00.000Z' },
    ]);
  });

  it('lists summaries, newest first', async () => {
    const repository = create();
    await repository.save(diagram('old', '2026-01-02T00:00:00.000Z'));
    await repository.save(diagram('new', '2026-01-05T00:00:00.000Z'));
    expect((await repository.list()).map((summary) => summary.id)).toEqual(['new', 'old']);
  });

  it('deletes a diagram', async () => {
    const repository = create();
    await repository.save(diagram('a', '2026-01-02T00:00:00.000Z'));
    await repository.delete('a');
    expect(await repository.list()).toEqual([]);
  });

  describe('conditional save', () => {
    const T1 = '2026-01-02T00:00:00.000Z';
    const T2 = '2026-01-03T00:00:00.000Z';

    it('writes when the stored updatedAt matches', async () => {
      const repository = create();
      await repository.save(diagram('a', T1));
      await repository.save({ ...diagram('a', T2), name: 'Next' }, { updatedAt: T1 });
      expect((await repository.load('a'))?.diagram.name).toBe('Next');
    });

    it('writes a new diagram when no record may exist and none does', async () => {
      const repository = create();
      await repository.save(diagram('a', T1), { updatedAt: null });
      expect(await repository.list()).toHaveLength(1);
    });

    it('refuses and writes nothing when the stored updatedAt differs', async () => {
      const repository = create();
      await repository.save(diagram('a', T2));
      await expect(
        repository.save(
          { ...diagram('a', '2026-01-04T00:00:00.000Z'), name: 'Mine' },
          { updatedAt: T1 },
        ),
      ).rejects.toBeInstanceOf(SaveConflictError);
      expect((await repository.load('a'))?.diagram.name).toBe('Diagram a');
    });

    it('refuses when the record was deleted since it was read', async () => {
      const repository = create();
      await expect(repository.save(diagram('a', T2), { updatedAt: T1 })).rejects.toBeInstanceOf(
        SaveConflictError,
      );
      expect(await repository.list()).toEqual([]);
    });

    it('refuses a new diagram when a record already exists', async () => {
      const repository = create();
      await repository.save(diagram('a', T1));
      await expect(
        repository.save({ ...diagram('a', T2), name: 'Mine' }, { updatedAt: null }),
      ).rejects.toBeInstanceOf(SaveConflictError);
      expect((await repository.load('a'))?.diagram.name).toBe('Diagram a');
    });
  });

  it('repairs dangling references on load and reports how many', async () => {
    const repository = create();
    const broken = {
      ...diagram('a', '2026-01-02T00:00:00.000Z'),
      nodes: [node('Page', 'component')],
      edges: [edge('e1', 'renders', 'Page->Ghost')],
    };
    await repository.save(broken);
    const loaded = await repository.load('a');
    expect(loaded?.droppedReferences).toBe(1);
    expect(loaded?.diagram.edges).toEqual([]);
  });

  it('repairs a stored diagram that is domain-invalid', async () => {
    const repository = create();
    const damaged = {
      ...diagram('a', '2026-01-02T00:00:00.000Z'),
      nodes: [
        node('Page', 'component', { items: [item('x', 'method')] }),
        node('Page', 'component'),
        node('List', 'component'),
      ],
      edges: [edge('e1', 'provides', 'Page->List')],
      viewport: { x: 5, y: 5, zoom: 0 },
    };
    await repository.save(damaged);
    const loaded = await repository.load('a');
    // The disallowed item, the repeated node and the edge its endpoints refuse.
    expect(loaded?.droppedReferences).toBe(3);
    expect(loaded?.diagram.nodes.map((n) => [n.id, n.items.length])).toEqual([
      ['Page', 0],
      ['List', 0],
    ]);
    expect(loaded?.diagram.edges).toEqual([]);
    expect(loaded?.diagram.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

const DATABASE = 'components-diagram';
const STORE = 'diagrams';

/** Opens the same database the repository uses, to plant or inspect raw records. */
async function putRawRecord(factory: IDBFactory, record: unknown): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('open failed'));
    };
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('put failed'));
    };
  });
  database.close();
}

/**
 * Wraps a real factory so every write transaction aborts right after its request
 * succeeds, the way a quota error surfaces in a browser.
 */
function abortingFactory(real: IDBFactory): IDBFactory {
  const wrapTransaction = (transaction: IDBTransaction): IDBTransaction =>
    new Proxy(transaction, {
      get: (target, property) => {
        if (property !== 'objectStore') return bind(target, property);
        return (name: string) => wrapStore(target, target.objectStore(name));
      },
    });
  const wrapStore = (transaction: IDBTransaction, store: IDBObjectStore): IDBObjectStore =>
    new Proxy(store, {
      get: (target, property) => {
        if (property !== 'put' && property !== 'delete') return bind(target, property);
        return (...args: unknown[]) => {
          const request = (target[property] as (...a: unknown[]) => IDBRequest)(...args);
          request.addEventListener('success', () => {
            transaction.abort();
          });
          return request;
        };
      },
    });
  const wrapDatabase = (database: IDBDatabase): IDBDatabase =>
    new Proxy(database, {
      get: (target, property) => {
        if (property !== 'transaction') return bind(target, property);
        return (...args: Parameters<IDBDatabase['transaction']>) =>
          wrapTransaction(target.transaction(...args));
      },
    });
  const wrapRequest = (request: IDBOpenDBRequest): IDBOpenDBRequest =>
    new Proxy(request, {
      get: (target, property) =>
        property === 'result' ? wrapDatabase(target.result) : bind(target, property),
      set: (target, property, value) => Reflect.set(target, property, value),
    });
  return new Proxy(real, {
    get: (target, property) =>
      property === 'open'
        ? (name: string, version?: number) => wrapRequest(target.open(name, version))
        : bind(target, property),
  });
}

function bind(target: object, property: string | symbol): unknown {
  const value: unknown = Reflect.get(target, property, target);
  return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
}

describe('indexed-db diagram repository failures', () => {
  it('rejects save when the transaction aborts after the request succeeded', async () => {
    const repository = createIndexedDbDiagramRepository(abortingFactory(new IDBFactory()));
    await expect(repository.save(diagram('a', '2026-01-02T00:00:00.000Z'))).rejects.toThrow();
  });

  it('rejects delete when the transaction aborts after the request succeeded', async () => {
    const repository = createIndexedDbDiagramRepository(abortingFactory(new IDBFactory()));
    await expect(repository.delete('a')).rejects.toThrow();
  });

  it('rejects list cleanly when IndexedDB cannot be opened', async () => {
    const broken = {
      open: () => {
        throw new Error('IndexedDB is unavailable');
      },
    } as unknown as IDBFactory;
    await expect(createIndexedDbDiagramRepository(broken).list()).rejects.toThrow(
      'IndexedDB is unavailable',
    );
  });

  it('rejects load with the readable reason when the stored record is invalid', async () => {
    const factory = new IDBFactory();
    const bad = {
      ...diagram('a', '2026-01-02T00:00:00.000Z'),
      nodes: [{ ...node('P', 'component'), kind: 'widget' }],
    };
    await putRawRecord(factory, bad);
    await expect(createIndexedDbDiagramRepository(factory).load('a')).rejects.toThrow(
      /nodes\.0\.kind/,
    );
  });

  it('rejects load with the newer-version reason for a future schemaVersion', async () => {
    const factory = new IDBFactory();
    await putRawRecord(factory, { ...diagram('a', '2026-01-02T00:00:00.000Z'), schemaVersion: 2 });
    await expect(createIndexedDbDiagramRepository(factory).load('a')).rejects.toThrow(
      'This diagram was saved by a newer version of the app (format 2). Update the app to open it.',
    );
  });
});
