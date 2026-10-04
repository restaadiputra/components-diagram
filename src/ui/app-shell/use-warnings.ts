import { warningsFor } from '../../application/diagram-warnings';
import type { DiagramWarning } from '../../domain/warnings/types';
import { useDiagramState } from './services-context';

/** `warningsFor` is memoized per diagram, so every caller shares one computation. */
export function useWarnings(): DiagramWarning[] {
  const diagram = useDiagramState((state) => state.diagram);
  return warningsFor(diagram);
}
