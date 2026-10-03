import type { Diagram } from './diagram';

/**
 * Handle ids are built as `in:<id>`-style strings, so a colon in an id would make
 * them ambiguous. Renaming would mean rewriting every reference, so such entities go.
 */
function isUsable(id: string, seen: Set<string>): boolean {
  if (id.includes(':') || seen.has(id)) return false;
  seen.add(id);
  return true;
}

/** Keeps the first entity of each id; returns the same array when nothing is dropped. */
function keepFirstUsable<T extends { id: string }>(entities: T[], seen: Set<string>): T[] {
  const kept = entities.filter((entity) => isUsable(entity.id, seen));
  return kept.length === entities.length ? entities : kept;
}

/**
 * Drops entities whose id contains a colon or repeats an earlier one. Item and link
 * ids are unique across the whole diagram, not just within their node, because the
 * canvas and trace look items up by id alone.
 */
export function dropUnusableIds(diagram: Diagram): Diagram {
  const itemIds = new Set<string>();
  const linkIds = new Set<string>();
  const nodes = keepFirstUsable(diagram.nodes, new Set());
  const cleaned = nodes.map((node) => {
    const items = keepFirstUsable(node.items, itemIds);
    const links = keepFirstUsable(node.links, linkIds);
    return items === node.items && links === node.links ? node : { ...node, items, links };
  });
  const edges = keepFirstUsable(diagram.edges, new Set());
  const unchanged =
    edges === diagram.edges &&
    nodes === diagram.nodes &&
    cleaned.every((node, index) => node === nodes[index]);
  return unchanged ? diagram : { ...diagram, nodes: cleaned, edges };
}
