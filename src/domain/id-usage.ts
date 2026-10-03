import type { Diagram } from './diagram';

/**
 * Ids are injected by the caller, so a command must check they are free. Item and
 * link ids are unique across the whole diagram, matching what `repairDiagram` keeps.
 */
export const isNodeIdUsed = (diagram: Diagram, id: string): boolean =>
  diagram.nodes.some((node) => node.id === id);

export const isEdgeIdUsed = (diagram: Diagram, id: string): boolean =>
  diagram.edges.some((edge) => edge.id === id);

export const isItemIdUsed = (diagram: Diagram, id: string): boolean =>
  diagram.nodes.some((node) => node.items.some((item) => item.id === id));

export const isLinkIdUsed = (diagram: Diagram, id: string): boolean =>
  diagram.nodes.some((node) => node.links.some((link) => link.id === id));
