import type { Diagram } from '../../domain/diagram';

export function renameDiagram(diagram: Diagram, name: string): Diagram {
  const trimmed = name.trim();
  return trimmed === '' || trimmed === diagram.name ? diagram : { ...diagram, name: trimmed };
}
