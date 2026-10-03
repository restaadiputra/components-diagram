import {
  EDGE_KIND_VALUES,
  findItem,
  findNode,
  sameEndpoint,
  type Diagram,
  type EdgeKind,
  type Endpoint,
} from './diagram';
import { EDGE_KINDS, type EndpointRule } from './edge-kinds';

export interface ConnectionCandidate {
  kind: EdgeKind;
  source: Endpoint;
  target: Endpoint;
}

function matches(diagram: Diagram, endpoint: Endpoint, rule: EndpointRule): boolean {
  const node = findNode(diagram, endpoint.nodeId);
  if (!node || !rule.nodeKinds.includes(node.kind)) return false;
  if (rule.itemKinds === 'node') return endpoint.itemId === undefined;
  const item = findItem(diagram, endpoint);
  return item !== undefined && rule.itemKinds.includes(item.kind);
}

function isDuplicate(diagram: Diagram, candidate: ConnectionCandidate): boolean {
  return diagram.edges.some(
    (edge) =>
      edge.kind === candidate.kind &&
      sameEndpoint(edge.source, candidate.source) &&
      sameEndpoint(edge.target, candidate.target),
  );
}

/** A hook's values can only be bound by a node that uses that hook. */
function hasHookUsage(diagram: Diagram, candidate: ConnectionCandidate): boolean {
  const pair = [candidate.source.nodeId, candidate.target.nodeId];
  return diagram.edges.some(
    (edge) =>
      edge.kind === 'uses-hook' &&
      pair.includes(edge.source.nodeId) &&
      pair.includes(edge.target.nodeId),
  );
}

export function canConnect(diagram: Diagram, candidate: ConnectionCandidate): boolean {
  // Relationships inside one node are internal links, never edges.
  if (candidate.source.nodeId === candidate.target.nodeId) return false;
  if (isDuplicate(diagram, candidate)) return false;
  if (candidate.kind === 'binds-hook' && !hasHookUsage(diagram, candidate)) return false;
  return EDGE_KINDS[candidate.kind].rules.some(
    (rule) =>
      matches(diagram, candidate.source, rule.source) &&
      matches(diagram, candidate.target, rule.target),
  );
}

export function validEdgeKinds(diagram: Diagram, source: Endpoint, target: Endpoint): EdgeKind[] {
  return EDGE_KIND_VALUES.filter((kind) => canConnect(diagram, { kind, source, target }));
}
