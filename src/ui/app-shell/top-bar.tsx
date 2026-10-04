import { ImportStatusLine } from './import-status-line';
import { SaveStatusLabel } from './save-status-label';
import { useDiagramState, useServices } from './services-context';

const BUTTON = 'rounded border px-2 py-0.5 disabled:opacity-40';

export function TopBar({ onOpenList }: { onOpenList: () => void }) {
  const { store, session, projectImportSupported } = useServices();
  const importing = useDiagramState((state) => state.importStatus.phase !== 'idle');
  const name = useDiagramState((state) => state.diagram.name);
  const canUndo = useDiagramState((state) => state.history.past.length > 0);
  const canRedo = useDiagramState((state) => state.history.future.length > 0);

  return (
    <header className="flex items-center gap-2 border-b px-3 py-2 text-sm">
      <button
        data-testid="diagram-name"
        className="font-semibold after:ml-1 after:content-['▾']"
        onClick={onOpenList}
      >
        {name}
      </button>
      <button className={BUTTON} disabled={!canUndo} onClick={() => store.getState().undo()}>
        Undo
      </button>
      <button className={BUTTON} disabled={!canRedo} onClick={() => store.getState().redo()}>
        Redo
      </button>
      <span className="ml-auto" />
      <button className={BUTTON} onClick={() => session.exportCurrent()}>
        Export
      </button>
      <button className={BUTTON} onClick={() => void session.importFile()}>
        Import
      </button>
      <button
        data-testid="import-project"
        className={BUTTON}
        disabled={!projectImportSupported || importing}
        title={projectImportSupported ? undefined : 'Importing a project needs Chrome or Edge'}
        onClick={() => void session.importProject()}
      >
        Import project…
      </button>
      <ImportStatusLine />
      <SaveStatusLabel />
    </header>
  );
}
