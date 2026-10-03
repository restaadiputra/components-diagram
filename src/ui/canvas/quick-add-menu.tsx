import { NODE_KIND_VALUES, type NodeKind } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';

interface QuickAddMenuProps {
  /** Screen (client) coordinates of the double-click. */
  at: { x: number; y: number };
  onChoose: (kind: NodeKind) => void;
}

export function QuickAddMenu({ at, onChoose }: QuickAddMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Add node"
      className="fixed z-10 rounded-md border bg-white p-1 text-sm shadow-lg"
      style={{ left: at.x, top: at.y }}
    >
      {NODE_KIND_VALUES.map((kind) => (
        <button
          key={kind}
          role="menuitem"
          className="block w-full rounded px-3 py-1 text-left hover:bg-slate-100"
          onClick={() => onChoose(kind)}
        >
          {NODE_KINDS[kind].icon} {NODE_KINDS[kind].label}
        </button>
      ))}
    </div>
  );
}
