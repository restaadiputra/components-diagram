import { createDiagram, type Diagram } from '../domain/diagram';
import type { DiagramRepository, DiagramSummary, LoadedDiagram } from './ports/diagram-repository';
import type { LastOpenedStore } from './ports/last-opened-store';

export interface LibraryDeps {
  repository: DiagramRepository;
  lastOpened: LastOpenedStore;
  newId: () => string;
  now: () => string;
}

/** The set of saved diagrams: everything that does not involve the open one. */
export interface DiagramLibrary {
  list: () => Promise<DiagramSummary[]>;
  open: (id: string) => Promise<LoadedDiagram | undefined>;
  remember: (id: string) => void;
  createNew: (name?: string) => Promise<Diagram>;
  /** Stores a diagram from outside under a fresh id, so it never overwrites one. */
  adopt: (diagram: Diagram) => Promise<Diagram>;
  /** The diagram to show at startup: last opened, else most recent, else a new one. */
  openInitial: () => Promise<LoadedDiagram>;
  duplicate: (id: string) => Promise<Diagram | undefined>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createDiagramLibrary(deps: LibraryDeps): DiagramLibrary {
  const { repository, lastOpened, newId, now } = deps;

  const tryLoad = (id: string | null | undefined) =>
    id ? repository.load(id).catch(() => undefined) : Promise.resolve(undefined);

  const createNew = async (name = 'Untitled diagram') => {
    const diagram = createDiagram(newId(), name, now());
    await repository.save(diagram);
    return diagram;
  };

  // The first edit saves it, so a failed write here costs nothing.
  const createUnsaved = async () => {
    const diagram = createDiagram(newId(), 'Untitled diagram', now());
    await repository.save(diagram).catch(() => undefined);
    return diagram;
  };

  const adopt = async (diagram: Diagram) => {
    const copy = { ...diagram, id: newId(), updatedAt: now() };
    await repository.save(copy);
    return copy;
  };

  return {
    list: () => repository.list(),
    open: (id) => repository.load(id),
    remember: (id) => {
      lastOpened.set(id);
    },
    createNew,
    adopt,
    // Never rejects: the app must start even when storage is broken.
    openInitial: async () => {
      const last = await tryLoad(lastOpened.get());
      if (last) return last;
      const [latest] = await repository.list().catch(() => []);
      const recent = await tryLoad(latest?.id);
      return recent ?? { diagram: await createUnsaved(), droppedReferences: 0 };
    },
    duplicate: async (id) => {
      const found = await repository.load(id);
      return found ? adopt({ ...found.diagram, name: `${found.diagram.name} copy` }) : undefined;
    },
    rename: async (id, name) => {
      const found = await repository.load(id);
      const trimmed = name.trim();
      if (!found || trimmed === '') return;
      await repository.save({ ...found.diagram, name: trimmed, updatedAt: now() });
    },
    remove: (id) => repository.delete(id),
  };
}
