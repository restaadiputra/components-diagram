import { describe, expect, it } from 'vitest';
import { diagramOf, edge, ep, item, node } from '../../domain/testing/fixtures';
import { connect } from './connect';
import { removeEdge } from './remove-edge';
import { removeSelection } from './remove-selection';
import { renameDiagram } from './rename-diagram';

const page = node('Page', 'component', { items: [item('cartItems', 'state')] });
const list = node('List', 'component', { items: [item('items', 'prop')] });
const useCart = node('useCart', 'hook', {
  items: [item('cartId', 'parameter'), item('cart', 'return')],
});
const nodes = [page, list, useCart];

describe('connect', () => {
  it('adds a valid edge', () => {
    const next = connect(diagramOf(nodes), {
      id: 'e1',
      kind: 'passes-prop',
      source: ep('Page/cartItems'),
      target: ep('List/items'),
    });
    expect(next.edges).toEqual([edge('e1', 'passes-prop', 'Page/cartItems->List/items')]);
  });

  it('refuses an invalid edge', () => {
    const diagram = diagramOf(nodes);
    const input = { id: 'e1', kind: 'renders' as const, source: ep('Page'), target: ep('useCart') };
    expect(connect(diagram, input)).toBe(diagram);
  });
});

describe('removeEdge', () => {
  const diagram = diagramOf(nodes, [
    edge('e1', 'renders', 'Page->List'),
    edge('e2', 'uses-hook', 'Page->useCart'),
    edge('e3', 'binds-hook', 'Page/cartItems->useCart/cartId'),
    edge('e4', 'binds-hook', 'useCart/cart->Page/cartItems'),
  ]);

  it('removes one edge', () => {
    expect(removeEdge(diagram, 'e1').edges.map((e) => e.id)).toEqual(['e2', 'e3', 'e4']);
  });

  it('removes hook bindings along with the uses-hook edge they depend on', () => {
    expect(removeEdge(diagram, 'e2').edges.map((e) => e.id)).toEqual(['e1']);
  });

  it('returns the same diagram when the edge does not exist', () => {
    expect(removeEdge(diagram, 'ghost')).toBe(diagram);
  });
});

describe('removeSelection', () => {
  const diagram = diagramOf(nodes, [edge('e1', 'renders', 'Page->List')]);

  it('removes whatever is selected', () => {
    expect(removeSelection(diagram, { type: 'node', nodeId: 'List' }).nodes).toHaveLength(2);
    expect(removeSelection(diagram, { type: 'edge', edgeId: 'e1' }).edges).toEqual([]);
    const withoutItem = removeSelection(diagram, {
      type: 'item',
      nodeId: 'Page',
      itemId: 'cartItems',
    });
    expect(withoutItem.nodes[0]?.items).toEqual([]);
  });

  it('does nothing without a selection', () => {
    expect(removeSelection(diagram, null)).toBe(diagram);
  });

  it('does nothing when the selection no longer exists', () => {
    expect(removeSelection(diagram, { type: 'node', nodeId: 'ghost' })).toBe(diagram);
    expect(removeSelection(diagram, { type: 'edge', edgeId: 'ghost' })).toBe(diagram);
    expect(removeSelection(diagram, { type: 'item', nodeId: 'Page', itemId: 'ghost' })).toBe(
      diagram,
    );
  });
});

describe('renameDiagram', () => {
  it('renames, trimming whitespace, and ignores an empty name', () => {
    const diagram = diagramOf([]);
    expect(renameDiagram(diagram, ' Checkout ').name).toBe('Checkout');
    expect(renameDiagram(diagram, '  ')).toBe(diagram);
    expect(renameDiagram(diagram, 'Test')).toBe(diagram);
  });
});
