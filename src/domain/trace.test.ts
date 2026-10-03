import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, link, node } from './testing/fixtures';
import { trace, type TraceStep } from './trace';
import { describeStep } from './trace-description';

const page = node('Page', 'component', {
  items: [item('onAdd', 'handler'), item('cartItems', 'state'), item('title', 'state')],
  links: [link('l1', 'sets', 'onAdd->cartItems')],
});
const list = node('List', 'component', {
  items: [item('items', 'prop'), item('sync', 'effect')],
  links: [link('l2', 'depends-on', 'sync->items')],
});
const diagram = diagramOf(
  [page, list],
  [edge('e0', 'renders', 'Page->List'), edge('e1', 'passes-prop', 'Page/cartItems->List/items')],
);

describe('trace', () => {
  it('follows links and edges upstream and downstream', () => {
    const result = trace(diagram, 'cartItems');
    expect([...result.itemIds].sort()).toEqual(['cartItems', 'items', 'onAdd', 'sync']);
    expect(result.edgeIds).toEqual(['e1']);
    expect([...result.linkIds].sort()).toEqual(['l1', 'l2']);
  });

  it('orders steps from the origin to the last consumer', () => {
    const steps = trace(diagram, 'cartItems').steps.map((step) => describeStep(diagram, step));
    expect(steps).toEqual([
      'Page.onAdd sets Page.cartItems',
      'Page.cartItems is passed as prop to List.items',
      'List.items triggers List.sync',
    ]);
  });

  it('gives the same highlighted set from any item on the path', () => {
    expect([...trace(diagram, 'sync').itemIds].sort()).toEqual([
      'cartItems',
      'items',
      'onAdd',
      'sync',
    ]);
  });

  it('returns only the item itself when nothing is connected', () => {
    expect(trace(diagram, 'title')).toEqual({
      itemIds: ['title'],
      linkIds: [],
      edgeIds: [],
      steps: [],
    });
  });

  it('does not follow structural edges', () => {
    expect(trace(diagram, 'cartItems').edgeIds).not.toContain('e0');
  });

  it('terminates on a cycle and reports each link once', () => {
    const counter = node('Counter', 'component', {
      items: [item('h', 'handler'), item('s', 'state')],
      links: [link('l1', 'sets', 'h->s'), link('l2', 'reads', 'h->s')],
    });
    const result = trace(diagramOf([counter]), 's');
    expect([...result.itemIds].sort()).toEqual(['h', 's']);
    expect([...result.linkIds].sort()).toEqual(['l1', 'l2']);
    expect(result.steps).toHaveLength(2);
  });

  it('follows a prop that is only forwarded through a component', () => {
    const a = node('A', 'component', { items: [item('v', 'state')] });
    const b = node('B', 'component', { items: [item('p', 'prop')] });
    const c = node('C', 'component', { items: [item('q', 'prop')] });
    const drilled = diagramOf(
      [a, b, c],
      [edge('e1', 'passes-prop', 'A/v->B/p'), edge('e2', 'passes-prop', 'B/p->C/q')],
    );
    expect(trace(drilled, 'q').itemIds).toContain('v');
    expect(trace(drilled, 'v').edgeIds).toEqual(['e1', 'e2']);
  });
  describe('step order', () => {
    /** Builds one node whose `sets` links are the given from->to pairs. */
    function flowOf(ids: string[], pairs: string[]) {
      const links = pairs.map((pair, index) => link(`l${String(index)}`, 'sets', pair));
      const only = node('N', 'component', { items: ids.map((id) => item(id, 'state')), links });
      return diagramOf([only]);
    }

    function expectFlowOrder(steps: TraceStep[]) {
      steps.forEach((step, index) => {
        const feedsLater = steps.slice(index + 1).some((o) => o.toItemId === step.fromItemId);
        expect(feedsLater, `${step.fromItemId}->${step.toItemId} precedes a step feeding it`).toBe(
          false,
        );
      });
    }

    it('orders a downstream shortcut after the arcs that feed it', () => {
      const d = flowOf(['A', 'B', 'C', 'X'], ['A->B', 'A->C', 'C->B', 'B->X']);
      const { steps } = trace(d, 'A');
      expect(steps).toHaveLength(4);
      expectFlowOrder(steps);
    });

    it('orders an upstream shortcut after the arcs that feed it', () => {
      const d = flowOf(['u', 'v', 'w', 'D'], ['u->D', 'v->D', 'w->u', 'u->v']);
      const { steps } = trace(d, 'D');
      expect(steps).toHaveLength(4);
      expectFlowOrder(steps);
    });

    it('lists link and edge ids in step order', () => {
      const d = flowOf(['A', 'B', 'C', 'X'], ['A->B', 'A->C', 'C->B', 'B->X']);
      const result = trace(d, 'A');
      expect(result.linkIds).toEqual(result.steps.map((step) => step.via.id));
    });

    it('flows a read value from the source item to its reader', () => {
      const reader = node('N', 'component', {
        items: [item('h', 'handler'), item('s', 'state')],
        links: [link('l1', 'reads', 'h->s')],
      });
      const { steps } = trace(diagramOf([reader]), 's');
      expect(steps).toHaveLength(1);
      expect(steps[0]).toMatchObject({ fromItemId: 's', toItemId: 'h' });
    });
  });
});
