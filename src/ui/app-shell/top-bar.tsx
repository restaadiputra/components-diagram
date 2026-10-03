import { useDiagramState, useServices } from './services-context';

const BUTTON = 'rounded border px-2 py-0.5 disabled:opacity-40';

export function TopBar() {
  const { store } = useServices();
  const name = useDiagramState((state) => state.diagram.name);
  const canUndo = useDiagramState((state) => state.history.past.length > 0);
  const canRedo = useDiagramState((state) => state.history.future.length > 0);

  return (
    <header className="flex items-center gap-2 border-b px-3 py-2 text-sm">
      <span data-testid="diagram-name" className="font-semibold">
        {name}
      </span>
      <button className={BUTTON} disabled={!canUndo} onClick={() => store.getState().undo()}>
        Undo
      </button>
      <button className={BUTTON} disabled={!canRedo} onClick={() => store.getState().redo()}>
        Redo
      </button>
    </header>
  );
}
