import { NODE_KIND_VALUES } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';
import { NODE_KIND_MIME } from '../canvas/use-node-drop';

export function Palette() {
  return (
    <aside className="w-40 shrink-0 border-r bg-slate-50 p-2 text-sm">
      <p className="mb-2 text-xs uppercase text-slate-400">Drag onto the canvas</p>
      {NODE_KIND_VALUES.map((kind) => (
        <div
          key={kind}
          draggable
          data-testid={`palette-${kind}`}
          className="mb-1 cursor-grab rounded border bg-white px-2 py-1"
          style={{ borderColor: NODE_KINDS[kind].color }}
          onDragStart={(event) => {
            event.dataTransfer.setData(NODE_KIND_MIME, kind);
            event.dataTransfer.effectAllowed = 'move';
          }}
        >
          {NODE_KINDS[kind].icon} {NODE_KINDS[kind].label}
        </div>
      ))}
    </aside>
  );
}
