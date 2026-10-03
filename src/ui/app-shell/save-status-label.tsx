import type { SaveStatus } from '../../application/diagram-store';
import { useDiagramState } from './services-context';

const LABELS: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Save failed — export to keep your work',
};

export function SaveStatusLabel() {
  const status = useDiagramState((state) => state.saveStatus);
  return (
    <span
      data-testid="save-status"
      className={status === 'failed' ? 'text-red-700' : 'text-slate-500'}
    >
      {LABELS[status]}
    </span>
  );
}
