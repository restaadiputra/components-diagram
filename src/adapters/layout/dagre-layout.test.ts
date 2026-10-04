import { describe, expect, it } from 'vitest';
import type { DiagramNode } from '../../domain/diagram';
import { edge, item, node } from '../../domain/testing/fixtures';
import { dagreLayout } from './dagre-layout';
import { estimateNodeSize } from './estimate-node-size';

const at = (nodes: DiagramNode[], id: string) =>
  nodes.find((n) => n.id === id)?.position ?? { x: NaN, y: NaN };

function overlaps(a: DiagramNode, b: DiagramNode): boolean {
  const sa = estimateNodeSize(a);
  const sb = estimateNodeSize(b);
  return (
    a.position.x < b.position.x + sb.width &&
    b.position.x < a.position.x + sa.width &&
    a.position.y < b.position.y + sb.height &&
    b.position.y < a.position.y + sa.height
  );
}

const page = node('Page', 'component', { items: [item('a', 'state'), item('b', 'state')] });
const list = node('List', 'component', { items: [item('items', 'prop')] });
const hook = node('useCart', 'hook');
const lone1 = node('Lone1', 'component');
const lone2 = node('Lone2', 'component');
const edges = [edge('e1', 'renders', 'Page->List'), edge('e2', 'uses-hook', 'Page->useCart')];

describe('estimateNodeSize', () => {
  it('grows with items and shrinks to the header when collapsed', () => {
    const open = estimateNodeSize(page);
    expect(open.height).toBeGreaterThan(estimateNodeSize(hook).height);
    expect(estimateNodeSize({ ...page, collapsed: true }).height).toBeLessThan(open.height);
  });
});

describe('dagreLayout', () => {
  it('places a target to the right of its source', () => {
    const laid = dagreLayout([page, list, hook], edges);
    const width = estimateNodeSize(page).width;
    expect(at(laid, 'List').x).toBeGreaterThanOrEqual(at(laid, 'Page').x + width);
    expect(at(laid, 'useCart').x).toBeGreaterThanOrEqual(at(laid, 'Page').x + width);
  });

  it('never overlaps two boxes', () => {
    const laid = dagreLayout([page, list, hook, lone1, lone2], edges);
    for (const [index, first] of laid.entries()) {
      for (const second of laid.slice(index + 1)) expect(overlaps(first, second)).toBe(false);
    }
  });

  it('puts unconnected nodes below the connected layout', () => {
    const laid = dagreLayout([page, list, hook, lone1], edges);
    const connectedBottom = Math.max(
      ...['Page', 'List', 'useCart'].map((id) => {
        const target = laid.find((n) => n.id === id);
        return target ? target.position.y + estimateNodeSize(target).height : 0;
      }),
    );
    expect(at(laid, 'Lone1').y).toBeGreaterThanOrEqual(connectedBottom);
  });

  it('survives a cycle and an edge to an unknown node', () => {
    const cyclic = [
      edge('c1', 'renders', 'Page->List'),
      edge('c2', 'renders', 'List->Page'),
      edge('c3', 'renders', 'Page->Ghost'),
    ];
    expect(() => dagreLayout([page, list], cyclic)).not.toThrow();
  });

  it('handles no nodes', () => {
    expect(dagreLayout([], [])).toEqual([]);
  });

  it('does not mutate its input and is deterministic', () => {
    const input = [page, list, hook];
    const first = dagreLayout(input, edges);
    expect(input.every((n) => n.position.x === 0 && n.position.y === 0)).toBe(true);
    expect(dagreLayout(input, edges)).toEqual(first);
  });

  it('starts at the origin with integer positions', () => {
    const laid = dagreLayout([page, list, hook], edges);
    expect(Math.min(...laid.map((n) => n.position.x))).toBe(0);
    expect(Math.min(...laid.map((n) => n.position.y))).toBe(0);
    expect(
      laid.every((n) => Number.isInteger(n.position.x) && Number.isInteger(n.position.y)),
    ).toBe(true);
  });
});
