import { describe, expect, it } from 'vitest';
import { canConnect, validEdgeKinds } from './connection-rules';
import { diagramOf, edge, ep, item, node } from './testing/fixtures';

const page = node('Page', 'component', {
  items: [item('cartItems', 'state'), item('onAdd', 'handler'), item('userId', 'prop')],
});
const list = node('List', 'component', { items: [item('items', 'prop'), item('rows', 'derived')] });
const useCart = node('useCart', 'hook', {
  items: [item('cartId', 'parameter'), item('cart', 'return')],
});
const theme = node('Theme', 'context', { items: [item('mode', 'value')] });
const api = node('api', 'service', { items: [item('fetchCart', 'method')] });
const cartQuery = node('cartQuery', 'query-cache', { items: [item('cart$', 'query')] });
const cartMutation = node('cartMutation', 'query-cache', { items: [item('addItem', 'mutation')] });

const nodes = [page, list, useCart, theme, api, cartQuery, cartMutation];
const diagram = diagramOf(nodes);

function kinds(path: string, within = diagram) {
  const [from = '', to = ''] = path.split('->');
  return validEdgeKinds(within, ep(from), ep(to));
}

describe('validEdgeKinds', () => {
  it.each([
    ['Page->List', ['renders']],
    ['Page/cartItems->List/items', ['passes-prop']],
    ['Page/onAdd->List/items', ['passes-callback']],
    ['Page->Theme', ['provides']],
    ['Theme/mode->List/rows', ['consumes']],
    ['cartQuery/cart$->List/rows', ['consumes']],
    ['Page->useCart', ['uses-hook']],
    ['Page/onAdd->api/fetchCart', ['calls']],
    ['cartQuery/cart$->api/fetchCart', ['calls']],
    ['Page/onAdd->cartMutation/addItem', ['calls']],
    ['cartMutation/addItem->cartQuery/cart$', ['calls', 'invalidates']],
  ])('%s allows %j', (path, expected) => {
    expect(kinds(path)).toEqual(expected);
  });

  it('offers both prop and callback when a prop is forwarded to a prop', () => {
    expect(kinds('Page/userId->List/items')).toEqual(['passes-prop', 'passes-callback']);
  });

  it.each([
    ['Page->api', 'renders into a service'],
    ['api->Page', 'a service rendering a component'],
    ['Page/cartItems->List', 'an item to a whole node'],
    ['List/items->Page/cartItems', 'a prop into state'],
    ['Theme/mode->api/fetchCart', 'a context value into a service'],
    ['Page->Page', 'a node to itself'],
    ['Page/onAdd->Page/cartItems', 'two items of the same node'],
    ['Page/cartItems->Ghost/items', 'a missing node'],
    ['Page/ghost->List/items', 'a missing item'],
  ])('%s is rejected (%s)', (path) => {
    expect(kinds(path)).toEqual([]);
  });
});

describe('canConnect', () => {
  it('rejects an exact duplicate', () => {
    const withEdge = diagramOf(nodes, [edge('e1', 'renders', 'Page->List')]);
    expect(canConnect(withEdge, { kind: 'renders', source: ep('Page'), target: ep('List') })).toBe(
      false,
    );
  });

  it('allows a second edge of a different kind between the same endpoints', () => {
    const withEdge = diagramOf(nodes, [edge('e1', 'passes-prop', 'Page/userId->List/items')]);
    expect(kinds('Page/userId->List/items', withEdge)).toEqual(['passes-callback']);
  });

  it('requires a uses-hook edge before hook values can be bound', () => {
    expect(kinds('Page/cartItems->useCart/cartId')).toEqual([]);
    expect(kinds('useCart/cart->Page/cartItems')).toEqual([]);
  });

  it('binds hook parameters and return values once the hook is used', () => {
    const withHook = diagramOf(nodes, [edge('e1', 'uses-hook', 'Page->useCart')]);
    expect(kinds('Page/cartItems->useCart/cartId', withHook)).toEqual(['binds-hook']);
    expect(kinds('useCart/cart->Page/cartItems', withHook)).toEqual(['binds-hook']);
  });
});
