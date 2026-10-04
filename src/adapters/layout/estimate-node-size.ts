import type { DiagramNode } from '../../domain/diagram';

export interface NodeSize {
  width: number;
  height: number;
}

/** Mirrors the canvas styling in src/ui/canvas (node width, header, item rows, add-item form). Change both together. */
export const NODE_METRICS = {
  width: 220,
  header: 36,
  row: 22,
  sectionLabel: 18,
  form: 28,
} as const;

export function estimateNodeSize(node: DiagramNode): NodeSize {
  const { width, header, row, sectionLabel, form } = NODE_METRICS;
  if (node.collapsed) return { width, height: header };
  const sections = new Set(node.items.map((item) => item.kind)).size;
  return { width, height: header + sections * sectionLabel + node.items.length * row + form };
}
