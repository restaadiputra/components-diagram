import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, link, node } from '../../domain/testing/fixtures';
import { addItem } from './add-item';
import { removeItem } from './remove-item';
import { updateItem } from './update-item';

const page = node('Page', 'component', {
  items: [item('onAdd', 'handler'), item('cartItems', 'state')],
  links: [link('l1', 'sets', 'onAdd->cartItems')],
});
const list = node('List', 'component', { items: [item('items', 'prop')] });
const diagram = diagramOf(
  [page, list],
  [edge('e1', 'renders', 'Page->List'), edge('e2', 'passes-prop', 'Page/cartItems->List/items')],
);

describe('item commands', () => {
  it('appends an item to its node', () => {
    const next = addItem(diagram, { nodeId: 'List', item: item('rows', 'derived') });
    expect(next.nodes[1]?.items.map((i) => i.id)).toEqual(['items', 'rows']);
  });

  it('rejects an item kind the node kind does not allow', () => {
    expect(addItem(diagram, { nodeId: 'List', item: item('fetch', 'method') })).toBe(diagram);
  });

  it('rejects an item id already used by any item in the diagram', () => {
    expect(addItem(diagram, { nodeId: 'List', item: item('cartItems', 'derived') })).toBe(diagram);
  });

  it('rejects an item with an empty name or a missing node', () => {
    const blank = { id: 'x', kind: 'state' as const, name: '  ' };
    expect(addItem(diagram, { nodeId: 'List', item: blank })).toBe(diagram);
    expect(addItem(diagram, { nodeId: 'Ghost', item: item('s', 'state') })).toBe(diagram);
  });

  it('updates name, type and note', () => {
    const next = updateItem(diagram, {
      nodeId: 'Page',
      itemId: 'cartItems',
      patch: { name: 'items', type: 'CartItem[]', note: 'server data' },
    });
    expect(next.nodes[0]?.items[1]).toEqual({
      id: 'cartItems',
      kind: 'state',
      name: 'items',
      type: 'CartItem[]',
      note: 'server data',
    });
  });

  it('removes an optional field when it is set to an empty string', () => {
    const typed = updateItem(diagram, {
      nodeId: 'Page',
      itemId: 'cartItems',
      patch: { type: 'X' },
    });
    const cleared = updateItem(typed, { nodeId: 'Page', itemId: 'cartItems', patch: { type: '' } });
    expect(cleared.nodes[0]?.items[1]).toEqual({
      id: 'cartItems',
      kind: 'state',
      name: 'cartItems',
    });
  });

  it('returns the same diagram when the patch changes nothing', () => {
    const input = { nodeId: 'Page', itemId: 'cartItems' };
    expect(updateItem(diagram, { ...input, patch: { name: 'cartItems' } })).toBe(diagram);
    expect(updateItem(diagram, { ...input, patch: {} })).toBe(diagram);
    expect(updateItem(diagram, { ...input, patch: { type: '' } })).toBe(diagram);
  });

  it('ignores an empty name and a missing item', () => {
    expect(updateItem(diagram, { nodeId: 'Page', itemId: 'cartItems', patch: { name: ' ' } })).toBe(
      diagram,
    );
    expect(updateItem(diagram, { nodeId: 'Page', itemId: 'ghost', patch: { name: 'x' } })).toBe(
      diagram,
    );
  });

  it('removes an item with its links and edges, keeping unrelated edges', () => {
    const next = removeItem(diagram, { nodeId: 'Page', itemId: 'cartItems' });
    expect(next.nodes[0]?.items.map((i) => i.id)).toEqual(['onAdd']);
    expect(next.nodes[0]?.links).toEqual([]);
    expect(next.edges.map((e) => e.id)).toEqual(['e1']);
  });

  it('returns the same diagram when the item does not exist', () => {
    expect(removeItem(diagram, { nodeId: 'Page', itemId: 'ghost' })).toBe(diagram);
  });
});
