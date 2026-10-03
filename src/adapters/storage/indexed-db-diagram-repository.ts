import type { DiagramRepository } from '../../application/ports/diagram-repository';
import { newestFirst, parseDiagram, parseSummary } from './diagram-schema';

const DATABASE = 'components-diagram';
const STORE = 'diagrams';

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  const request = factory.open(DATABASE, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE, { keyPath: 'id' });
  };
  return settle(request);
}

/**
 * A write only counts once its transaction completes: IndexedDB may still abort
 * after the request succeeded (quota exceeded is the usual cause).
 */
function settleTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted'));
    };
  });
}

/** Each record is one whole diagram, keyed by its id. */
export function createIndexedDbDiagramRepository(factory: IDBFactory): DiagramRepository {
  // Opened on first use so a failed open surfaces only through the method that needs it.
  let database: Promise<IDBDatabase> | undefined;
  const getDatabase = () => (database ??= openDatabase(factory));
  const records = async (mode: IDBTransactionMode) =>
    (await getDatabase()).transaction(STORE, mode).objectStore(STORE);
  const write = async (operation: (store: IDBObjectStore) => IDBRequest) => {
    const store = await records('readwrite');
    const done = settleTransaction(store.transaction);
    operation(store);
    await done;
  };

  return {
    save: (diagram) => write((store) => store.put(diagram)),
    load: async (id) => {
      const raw: unknown = await settle((await records('readonly')).get(id));
      if (raw === undefined) return undefined;
      const parsed = parseDiagram(raw);
      if (!parsed.ok) throw new Error(parsed.reason);
      return { diagram: parsed.diagram, droppedReferences: parsed.droppedReferences };
    },
    list: async () => {
      const all: unknown[] = await settle((await records('readonly')).getAll());
      return all.flatMap((raw) => parseSummary(raw) ?? []).sort(newestFirst);
    },
    delete: (id) => write((store) => store.delete(id)),
  };
}
