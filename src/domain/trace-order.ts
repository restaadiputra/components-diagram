interface Hop {
  from: string;
  to: string;
}

/** A hop is ready once no pending hop (other than itself) still delivers into its source. */
function isReady(hop: Hop, pending: Hop[]): boolean {
  return !pending.some((other) => other !== hop && other.to === hop.from);
}

/**
 * Orders hops so each one follows every hop that feeds its source, which is
 * what makes a step list read as a sentence-by-sentence story of the flow.
 * Discovery order breaks ties. On a cycle no hop is ready, so the earliest
 * pending one is emitted to guarantee progress and every hop appears once.
 */
export function orderByFlow<T extends Hop>(hops: T[]): T[] {
  const pending = [...hops];
  const ordered: T[] = [];
  while (pending.length > 0) {
    const index = Math.max(
      0,
      pending.findIndex((hop) => isReady(hop, pending)),
    );
    ordered.push(...pending.splice(index, 1));
  }
  return ordered;
}
