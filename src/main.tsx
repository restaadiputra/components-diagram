import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { browserFileGateway } from './adapters/storage/browser-file-gateway';
import { createInMemoryDiagramRepository } from './adapters/storage/in-memory-diagram-repository';
import { createIndexedDbDiagramRepository } from './adapters/storage/indexed-db-diagram-repository';
import { jsonDiagramCodec } from './adapters/storage/json-diagram-codec';
import { localStorageLastOpened } from './adapters/storage/local-storage-last-opened';
import { startAutosave } from './application/autosave';
import { createDiagramLibrary } from './application/diagram-library';
import { createSession, droppedNotice } from './application/diagram-session';
import { createDiagramStore } from './application/diagram-store';
import './index.css';
import { App } from './ui/app-shell/app';
import { ServicesProvider } from './ui/app-shell/services-context';

// Composition root: the only place that picks concrete implementations.

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Falls back to memory when IndexedDB is missing or blocked (some private modes). */
async function chooseRepository() {
  try {
    const repository = createIndexedDbDiagramRepository(indexedDB);
    await repository.list();
    return { repository, persistent: true };
  } catch {
    return { repository: createInMemoryDiagramRepository(), persistent: false };
  }
}

async function bootstrap() {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element is missing');

  const { repository, persistent } = await chooseRepository();
  const library = createDiagramLibrary({
    repository,
    lastOpened: localStorageLastOpened,
    newId,
    now,
  });
  const initial = await library.openInitial();
  library.remember(initial.diagram.id);

  const store = createDiagramStore(initial.diagram, now);
  // The session reports dropped references for later opens; startup needs the same message.
  store.getState().setNotice(droppedNotice(initial.droppedReferences));
  const autosave = startAutosave(store, repository);
  const session = createSession({
    store,
    library,
    autosave,
    codec: jsonDiagramCodec,
    files: browserFileGateway,
  });

  // Do not lose the last 800 ms of work when the tab is hidden or closed.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void autosave.flush();
  });
  window.addEventListener('pagehide', () => void autosave.flush());

  createRoot(root).render(
    <StrictMode>
      <ServicesProvider value={{ store, session, library, newId, persistent }}>
        <App />
      </ServicesProvider>
    </StrictMode>,
  );
}

bootstrap().catch(() => {
  // Without this a startup failure leaves a silent blank page.
  const root = document.getElementById('root');
  if (root) root.textContent = 'The app could not start. Reload the page to try again.';
});
