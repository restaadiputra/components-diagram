import type { Diagram, DiagramNode } from '../domain/diagram';
import { findWarnings } from '../domain/warnings/find-warnings';
import type { DiagramWarning } from '../domain/warnings/types';

/**
 * Commands return the same diagram reference when nothing changes, so keying on
 * the reference recomputes exactly when the diagram did.
 */
const cache = new WeakMap<Diagram, DiagramWarning[]>();

export function warningsFor(diagram: Diagram): DiagramWarning[] {
  const cached = cache.get(diagram);
  if (cached) return cached;
  const warnings = findWarnings(diagram);
  cache.set(diagram, warnings);
  return warnings;
}

/** A collapsed node hides its rows, so their warnings show on its header. */
export function nodeWarnings(warnings: DiagramWarning[], node: DiagramNode): DiagramWarning[] {
  return warnings.filter(
    (warning) =>
      warning.target.nodeId === node.id && (warning.target.itemId === undefined || node.collapsed),
  );
}

export function itemWarnings(warnings: DiagramWarning[], itemId: string): DiagramWarning[] {
  return warnings.filter((warning) => warning.target.itemId === itemId);
}
