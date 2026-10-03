import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, node } from '../../domain/testing/fixtures';
import { addNode } from './add-node';
import { moveNode } from './move-node';
import { removeNode } from './remove-node';
import { renameNode } from './rename-node';
import { toggleCollapsed } from './toggle-collapsed';

const page = node('Page', 'component', { items: [item('cartItems', 'state')] });
const list = node('List', 'component', { items: [item('items', 'prop')] });
const footer = node('Footer', 'component');
const diagram = diagramOf(
  [page, list, footer],
  [
    edge('e1', 'renders', 'Page->List'),
    edge('e2', 'passes-prop', 'Page/cartItems->List/items'),
    edge('e3', 'renders', 'Page->Footer'),
  ],
);

describe('node commands', () => {
  it('adds an empty, expanded node', () => {
    const next = addNode(diagramOf([]), {
      id: 'n1',
      kind: 'hook',
      name: 'useCart',
      position: { x: 10, y: 20 },
    });
    expect(next.nodes).toEqual([
      {
        id: 'n1',
        kind: 'hook',
        name: 'useCart',
        position: { x: 10, y: 20 },
        collapsed: false,
        items: [],
        links: [],
      },
    ]);
  });

  it('removes a node together with every edge that touches it', () => {
    const next = removeNode(diagram, 'List');
    expect(next.nodes.map((n) => n.id)).toEqual(['Page', 'Footer']);
    expect(next.edges.map((e) => e.id)).toEqual(['e3']);
  });

  it('renames a node, trimming whitespace', () => {
    expect(renameNode(diagram, { nodeId: 'Page', name: '  CartPage ' }).nodes[0]?.name).toBe(
      'CartPage',
    );
  });

  it('ignores an empty or unchanged name', () => {
    expect(renameNode(diagram, { nodeId: 'Page', name: '   ' })).toBe(diagram);
    expect(renameNode(diagram, { nodeId: 'Page', name: 'Page' })).toBe(diagram);
  });

  it('moves a node', () => {
    const next = moveNode(diagram, { nodeId: 'List', position: { x: 5, y: 6 } });
    expect(next.nodes[1]?.position).toEqual({ x: 5, y: 6 });
  });

  it('ignores a move to the same position', () => {
    expect(moveNode(diagram, { nodeId: 'List', position: { x: 0, y: 0 } })).toBe(diagram);
  });

  it('toggles collapsed', () => {
    expect(toggleCollapsed(diagram, 'Page').nodes[0]?.collapsed).toBe(true);
  });

  it('returns the same diagram when the node does not exist', () => {
    expect(removeNode(diagram, 'Ghost')).toBe(diagram);
    expect(renameNode(diagram, { nodeId: 'Ghost', name: 'X' })).toBe(diagram);
    expect(moveNode(diagram, { nodeId: 'Ghost', position: { x: 1, y: 1 } })).toBe(diagram);
    expect(toggleCollapsed(diagram, 'Ghost')).toBe(diagram);
  });
});
