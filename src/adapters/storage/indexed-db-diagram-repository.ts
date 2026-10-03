import {
  SaveConflictError,
  type DiagramRepository,
  type SaveExpectation,
} from '../../application/ports/diagram-repository';
import type { Diagram } from '../../domain/diagram';
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

/** The stored record's `updatedAt`, or null when there is none. */
function storedUpdatedAt(raw: unknown): string | null {
  return parseSummary(raw)?.updatedAt ?? null;
}

/**
 * Read and write share one readwrite transaction, so no other tab can slip a write in
 * between the check and the put. A mismatch aborts the transaction instead of writing.
 */
function putIfUnchanged(
  store: IDBObjectStore,
  diagram: Diagram,
  expected: SaveExpectation,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = settleTransaction(store.transaction);
    const current = store.get(diagram.id);
    const refuse = (reason: Error) => {
      // Rejecting first: the abort event would otherwise settle with a generic error.
      reject(reason);
      store.transaction.abort();
    };
    current.onsuccess = () => {
      if (storedUpdatedAt(current.result) !== expected.updatedAt) {
        refuse(new SaveConflictError());
        return;
      }
      // A throwing put inside this callback would otherwise be an unhandled error.
      try {
        store.put(diagram);
      } catch (error) {
        refuse(error instanceof Error ? error : new Error('IndexedDB put failed'));
      }
    };
    done.then(resolve, reject);
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
    save: async (diagram, expected) => {
      if (!expected) return write((store) => store.put(diagram));
      await putIfUnchanged(await records('readwrite'), diagram, expected);
    },
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
