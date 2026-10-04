import { findNode, type Diagram, type DiagramEdge, type EdgeKind } from '../diagram';
import type { DiagramWarning, WarningRule } from './types';

const FORWARDING: readonly EdgeKind[] = ['passes-prop', 'passes-callback'];

/** Forwarding edges join two items; node-level edges carry no value. */
function isForwarding(edge: DiagramEdge): boolean {
  return (
    FORWARDING.includes(edge.kind) &&
    edge.source.itemId !== undefined &&
    edge.target.itemId !== undefined
  );
}

/** A prop that is only handed on: no internal link touches it and nothing but forwarding leaves it. */
function isPassThrough(diagram: Diagram, edge: DiagramEdge): boolean {
  const itemId = edge.target.itemId;
  const node = findNode(diagram, edge.target.nodeId);
  if (itemId === undefined || !node) return false;
  const linked = node.links.some((l) => l.fromItemId === itemId || l.toItemId === itemId);
  return !linked && diagram.edges.every((e) => e.source.itemId !== itemId || isForwarding(e));
}

type ChainFinder = (itemId: string, seen: ReadonlySet<string>) => string[];

/** Longest run of nodes reached from an item, continuing only through pass-through props. */
function chainFinder(diagram: Diagram, forwards: DiagramEdge[]): ChainFinder {
  const longest: ChainFinder = (itemId, seen) => {
    let best: string[] = [];
    for (const edge of forwards) {
      const next = edge.target.itemId;
      if (edge.source.itemId !== itemId || next === undefined || seen.has(next)) continue;
      const onward = isPassThrough(diagram, edge) ? longest(next, new Set([...seen, next])) : [];
      const chain = [edge.target.nodeId, ...onward];
      if (chain.length > best.length) best = chain;
    }
    return best;
  };
  return longest;
}

export const propDrilling: WarningRule = (diagram, thresholds) => {
  const forwards = diagram.edges.filter(isForwarding);
  const received = new Set(forwards.map((edge) => edge.target.itemId));
  const longest = chainFinder(diagram, forwards);
  const warnings: DiagramWarning[] = [];
  const seenOrigins = new Set<string>();
  for (const { source } of forwards) {
    const itemId = source.itemId;
    if (itemId === undefined || received.has(itemId) || seenOrigins.has(itemId)) continue;
    seenOrigins.add(itemId);
    const chain = longest(itemId, new Set([itemId]));
    if (chain.length < thresholds.drillingHops) continue;
    const name = findNode(diagram, source.nodeId)?.items.find((i) => i.id === itemId)?.name;
    warnings.push({
      ruleId: 'prop-drilling',
      target: { nodeId: source.nodeId, itemId },
      message: `'${name ?? itemId}' is forwarded ${chain.length.toString()} levels without being used in between`,
      relatedNodeIds: [source.nodeId, ...chain],
    });
  }
  return warnings;
};
