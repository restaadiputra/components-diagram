import type { SaveStatus } from '../../application/diagram-store';
import { useDiagramState } from './services-context';

const LABELS: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Save failed — export to keep your work',
  conflict: 'Changed in another tab — export to keep your work',
};

const PROBLEMS: readonly SaveStatus[] = ['failed', 'conflict'];

export function SaveStatusView({ status }: { status: SaveStatus }) {
  return (
    <span
      data-testid="save-status"
      className={PROBLEMS.includes(status) ? 'text-red-700' : 'text-slate-500'}
    >
      {LABELS[status]}
    </span>
  );
}

export function SaveStatusLabel() {
  return <SaveStatusView status={useDiagramState((state) => state.saveStatus)} />;
}
