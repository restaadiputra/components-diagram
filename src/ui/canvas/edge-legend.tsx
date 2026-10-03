import { DASH_ARRAY } from '../../adapters/canvas/to-flow';
import { EDGE_KIND_VALUES } from '../../domain/diagram';
import { EDGE_KINDS } from '../../domain/edge-kinds';

export function EdgeLegend() {
  return (
    <ul
      aria-label="Edge legend"
      className="absolute left-2 top-2 rounded-md border bg-white/90 p-2 text-[11px] shadow-sm"
    >
      {EDGE_KIND_VALUES.map((kind) => {
        const spec = EDGE_KINDS[kind];
        return (
          <li key={kind} className="flex items-center gap-2">
            <svg width="28" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="28"
                y2="3"
                stroke={spec.color}
                strokeWidth="2"
                strokeDasharray={DASH_ARRAY[spec.dash]}
              />
            </svg>
            {spec.label}
          </li>
        );
      })}
    </ul>
  );
}
