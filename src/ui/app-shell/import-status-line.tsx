import { useDiagramState, useServices } from './services-context';

export function ImportStatusLine() {
  const { session } = useServices();
  const status = useDiagramState((state) => state.importStatus);
  if (status.phase === 'idle') return null;
  const text =
    status.phase === 'reading' ? `Reading ${status.files.toString()} files…` : 'Analyzing…';
  return (
    <span className="flex items-center gap-2 text-slate-500">
      {text}
      <button
        className="rounded border px-2 py-0.5"
        onClick={() => {
          session.cancelImport();
        }}
      >
        Cancel
      </button>
    </span>
  );
}
