import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiagramSummary } from '../../application/ports/diagram-repository';
import { useDiagramState, useServices } from '../app-shell/services-context';
import { CommitInput } from './commit-input';
import { useModalFocus } from './use-modal-focus';

const BUTTON = 'rounded border px-2 py-1';

interface DiagramRowProps {
  row: DiagramSummary;
  isOpen: boolean;
  /** Runs an action, then refreshes the list. */
  run: (action: Promise<void>) => void;
  onClose: () => void;
}

function DiagramRow({ row, isOpen, run, onClose }: DiagramRowProps) {
  const { session } = useServices();
  const remove = () => {
    if (window.confirm(`Delete "${row.name}"? This cannot be undone.`)) run(session.remove(row.id));
  };
  return (
    <li data-testid="diagram-row" className="flex items-end gap-2">
      <div className="flex-1">
        <CommitInput
          key={`${row.id}:${row.name}`}
          label={isOpen ? 'Name (open now)' : 'Name'}
          value={row.name}
          onCommit={(name) => run(session.rename(row.id, name))}
        />
      </div>
      <button className={`${BUTTON} mb-2`} onClick={() => void session.open(row.id).then(onClose)}>
        Open
      </button>
      <button className={`${BUTTON} mb-2`} onClick={() => run(session.duplicate(row.id))}>
        Duplicate
      </button>
      <button className={`${BUTTON} mb-2 border-red-300 text-red-700`} onClick={remove}>
        Delete
      </button>
    </li>
  );
}

export function DiagramList({ onClose }: { onClose: () => void }) {
  const { library, session, store } = useServices();
  const openId = useDiagramState((state) => state.diagram.id);
  const [rows, setRows] = useState<DiagramSummary[]>([]);
  // Only the latest refresh may set state; the counter also goes stale on unmount.
  const latestRefresh = useRef(0);
  useEffect(
    () => () => {
      latestRefresh.current = -1;
    },
    [],
  );

  // Flush first so the open diagram's latest name and time are in the list.
  const refresh = useCallback(() => {
    latestRefresh.current += 1;
    const mine = latestRefresh.current;
    void session
      .flush()
      .then(() => library.list())
      .then(
        (list) => {
          if (latestRefresh.current === mine) setRows(list);
        },
        () => {
          if (latestRefresh.current === mine) {
            store.getState().setNotice('The diagram list could not be loaded.');
          }
        },
      );
  }, [library, session, store]);
  useEffect(refresh, [refresh]);

  const run = (action: Promise<void>) => void action.then(refresh);

  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel, onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diagrams"
      className="fixed inset-0 z-20 flex items-start justify-center bg-black/30 pt-20"
      onClick={onClose}
    >
      <div
        ref={panel}
        className="w-[36rem] rounded-md bg-white p-4 text-sm shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-auto font-semibold">Diagrams</h2>
          <button className={BUTTON} onClick={() => void session.createNew().then(onClose)}>
            New diagram
          </button>
          <button className={BUTTON} onClick={onClose}>
            Close
          </button>
        </div>
        <ul>
          {rows.map((row) => (
            <DiagramRow
              key={row.id}
              row={row}
              isOpen={row.id === openId}
              run={run}
              onClose={onClose}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
