import { useState } from 'react';
import { DiagramList } from '../panels/diagram-list';
import { SaveStatusLabel } from './save-status-label';
import { useDiagramState, useServices } from './services-context';

const BUTTON = 'rounded border px-2 py-0.5 disabled:opacity-40';

export function TopBar() {
  const { store, session } = useServices();
  const name = useDiagramState((state) => state.diagram.name);
  const canUndo = useDiagramState((state) => state.history.past.length > 0);
  const canRedo = useDiagramState((state) => state.history.future.length > 0);
  const [listOpen, setListOpen] = useState(false);

  return (
    <header className="flex items-center gap-2 border-b px-3 py-2 text-sm">
      <button
        data-testid="diagram-name"
        className="font-semibold after:ml-1 after:content-['▾']"
        onClick={() => setListOpen(true)}
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
      <SaveStatusLabel />
      {listOpen && <DiagramList onClose={() => setListOpen(false)} />}
    </header>
  );
}
