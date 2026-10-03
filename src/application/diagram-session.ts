import type { Diagram } from '../domain/diagram';
import type { Autosave } from './autosave';
import { renameDiagram } from './commands/rename-diagram';
import type { DiagramLibrary } from './diagram-library';
import type { DiagramStore } from './diagram-store';
import type { DiagramCodec } from './ports/diagram-codec';
import type { LoadedDiagram } from './ports/diagram-repository';
import type { FileGateway } from './ports/file-gateway';

export interface SessionDeps {
  store: DiagramStore;
  library: DiagramLibrary;
  autosave: Autosave;
  codec: DiagramCodec;
  files: FileGateway;
}

/** Use cases that change which diagram is open, or move one in or out of the app. */
export interface DiagramSession {
  flush: () => Promise<void>;
  open: (id: string) => Promise<void>;
  createNew: () => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  exportCurrent: () => void;
  importFile: () => Promise<void>;
}

export function fileNameFor(name: string): string {
  const base = name
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base === '' ? 'diagram' : base}.diagram.json`;
}

function droppedNotice(count: number): string | null {
  if (count === 0) return null;
  const subject =
    count === 1 ? '1 broken connection was' : `${String(count)} broken connections were`;
  return `${subject} removed while opening this diagram.`;
}

const UNSAVED_NOTICE =
  'This diagram could not be saved, so it is still open. Export it to keep your work.';

type Fetch = () => Promise<LoadedDiagram | undefined>;

const fresh = (diagram: Diagram): LoadedDiagram => ({ diagram, droppedReferences: 0 });

/**
 * Every use case that replaces the open diagram goes through `switchTo`: nothing is
 * loaded unless the open diagram is fully saved, checked once before fetching the
 * target and again just before loading it, because edits can land during the fetch.
 */
function createSwitcher({
  store,
  library,
  autosave,
}: Pick<SessionDeps, 'store' | 'library' | 'autosave'>) {
  const notify = (message: string | null) => store.getState().setNotice(message);

  const show = (loaded: LoadedDiagram) => {
    store.getState().load(loaded.diagram);
    library.remember(loaded.diagram.id);
    notify(droppedNotice(loaded.droppedReferences));
  };

  const switchTo = async (fetch: Fetch, describeFailure: (error: unknown) => string) => {
    if (!(await autosave.flush())) {
      notify(UNSAVED_NOTICE);
      return;
    }
    let loaded: LoadedDiagram | undefined;
    try {
      loaded = await fetch();
    } catch (error) {
      notify(describeFailure(error));
      return;
    }
    if (!loaded) {
      notify('That diagram no longer exists.');
      return;
    }
    // No await between this check and `show`, so no edit can slip in.
    if (!(await autosave.flush())) {
      notify(UNSAVED_NOTICE);
      return;
    }
    show(loaded);
  };

  return { show, switchTo, notify };
}

/** Deleting the open diagram: nothing may save it again while it is being removed. */
function createRemover(
  { library, autosave }: Pick<SessionDeps, 'library' | 'autosave'>,
  isOpen: (id: string) => boolean,
  switcher: ReturnType<typeof createSwitcher>,
) {
  // A replacement that is missing or unreadable is treated as absent: leaving the deleted
  // diagram on screen would let the next edit write it back.
  const mostRecentOrNew = async (): Promise<LoadedDiagram> => {
    const [latest] = await library.list().catch(() => []);
    const loaded = latest ? await library.open(latest.id).catch(() => undefined) : undefined;
    return loaded ?? fresh(await library.createNew());
  };

  const removeOpen = async (id: string) => {
    await autosave.suspend();
    try {
      await library.remove(id);
    } catch {
      switcher.notify('The diagram could not be deleted.');
      // Not deleted after all: resume() schedules a save if its changes were dropped.
      autosave.resume();
      return;
    }
    try {
      switcher.show(await mostRecentOrNew());
    } catch {
      switcher.notify('The diagram could not be opened.');
    } finally {
      autosave.resume();
    }
  };

  return async (id: string) => {
    if (isOpen(id)) return removeOpen(id);
    try {
      await library.remove(id);
    } catch {
      switcher.notify('The diagram could not be deleted.');
    }
  };
}

/** Resolves to undefined when the user cancels or the file cannot be read; the latter also sets a notice. */
async function readImportText(
  files: FileGateway,
  store: DiagramStore,
): Promise<string | undefined> {
  try {
    return await files.openText();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The file could not be read.';
    store.getState().setNotice(message);
    return undefined;
  }
}

export function createSession(deps: SessionDeps): DiagramSession {
  const { store, library, autosave, codec, files } = deps;
  const state = () => store.getState();
  const switcher = createSwitcher(deps);
  const { switchTo, notify } = switcher;
  const remove = createRemover(deps, (id) => id === state().diagram.id, switcher);

  const renameOther = async (id: string, name: string) => {
    try {
      await library.rename(id, name);
    } catch {
      notify('The diagram could not be renamed.');
    }
  };

  return {
    flush: async () => {
      await autosave.flush();
    },
    open: (id) =>
      switchTo(
        () => library.open(id),
        (error) => (error instanceof Error ? error.message : 'The diagram could not be opened.'),
      ),
    createNew: () =>
      switchTo(
        async () => fresh(await library.createNew()),
        () => 'The new diagram could not be created.',
      ),
    duplicate: (id) =>
      switchTo(
        async () => {
          const copy = await library.duplicate(id);
          return copy && fresh(copy);
        },
        () => 'The diagram could not be duplicated.',
      ),
    rename: async (id, name) => {
      if (id !== state().diagram.id) return renameOther(id, name);
      state().apply((diagram) => renameDiagram(diagram, name));
      await autosave.flush();
    },
    remove,
    exportCurrent: () => {
      const { diagram } = state();
      files.saveText(fileNameFor(diagram.name), codec.serialize(diagram));
    },
    importFile: async () => {
      const text = await readImportText(files, store);
      if (text === undefined) return;
      const parsed = codec.parse(text);
      if (!parsed.ok) {
        notify(parsed.reason);
        return;
      }
      await switchTo(
        async () => ({
          diagram: await library.adopt(parsed.diagram),
          droppedReferences: parsed.droppedReferences,
        }),
        () => 'The file could not be imported.',
      );
    },
  };
}
