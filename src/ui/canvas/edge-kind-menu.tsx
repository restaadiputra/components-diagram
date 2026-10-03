import type { EdgeKind } from '../../domain/diagram';
import { EDGE_KINDS } from '../../domain/edge-kinds';

interface EdgeKindMenuProps {
  kinds: EdgeKind[];
  onChoose: (kind: EdgeKind) => void;
  onCancel: () => void;
}

/** Asks which relationship was meant when two endpoints fit several edge kinds. */
export function EdgeKindMenu({ kinds, onChoose, onCancel }: EdgeKindMenuProps) {
  return (
    <div
      role="dialog"
      aria-label="Choose edge kind"
      className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border bg-white p-2 text-sm shadow-lg"
    >
      <p className="mb-1 px-2 text-xs text-slate-500">What does this connection mean?</p>
      {kinds.map((kind) => (
        <button
          key={kind}
          className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100"
          onClick={() => onChoose(kind)}
        >
          <span style={{ color: EDGE_KINDS[kind].color }}>●</span> {EDGE_KINDS[kind].label}
        </button>
      ))}
      <button
        className="mt-1 block w-full rounded px-2 py-1 text-left text-slate-500"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
