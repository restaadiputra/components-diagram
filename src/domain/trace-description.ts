import type { Diagram, LinkRelation } from './diagram';
import { EDGE_KINDS } from './edge-kinds';
import { itemLabel } from './labels';
import type { TraceStep } from './trace';

/** Verbs read in the direction of data flow, which for readers is reversed. */
const LINK_VERBS: Record<LinkRelation, string> = {
  sets: 'sets',
  reads: 'is read by',
  'depends-on': 'triggers',
};

export function describeStep(diagram: Diagram, step: TraceStep): string {
  const verb =
    step.via.type === 'edge' ? EDGE_KINDS[step.via.kind].verb : LINK_VERBS[step.via.relation];
  return `${itemLabel(diagram, step.fromItemId)} ${verb} ${itemLabel(diagram, step.toItemId)}`;
}
