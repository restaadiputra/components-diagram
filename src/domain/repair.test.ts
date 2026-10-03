import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEWPORT } from './diagram';
import { repairDiagram } from './repair';
import { diagramOf, edge, item, link, node } from './testing/fixtures';

const page = node('Page', 'component', {
  items: [item('onAdd', 'handler'), item('cartItems', 'state')],
  links: [link('l1', 'sets', 'onAdd->cartItems'), link('l2', 'sets', 'onAdd->ghost')],
});
const list = node('List', 'component', { items: [item('items', 'prop')] });
const useCart = node('useCart', 'hook', { items: [item('cartId', 'parameter')] });

const ids = (entities: { id: string }[]) => entities.map((entity) => entity.id);

describe('repairDiagram', () => {
  it('removes edges and links that point at missing nodes or items', () => {
    const broken = diagramOf(
      [page, list],
      [
        edge('e1', 'passes-prop', 'Page/cartItems->List/items'),
        edge('e2', 'passes-prop', 'Page/cartItems->List/ghost'),
        edge('e3', 'renders', 'Page->Ghost'),
      ],
    );
    const { diagram, dropped } = repairDiagram(broken);
    expect(dropped).toBe(3);
    expect(ids(diagram.edges)).toEqual(['e1']);
    expect(ids(diagram.nodes[0]?.links ?? [])).toEqual(['l1']);
  });

  it('returns the same diagram and zero for a sound diagram', () => {
    const sound = diagramOf([list], []);
    const result = repairDiagram(sound);
    expect(result.diagram).toBe(sound);
    expect(result.dropped).toBe(0);
  });

  describe('items the node kind does not allow', () => {
    const service = node('Api', 'service', {
      items: [item('get', 'method'), item('stray', 'prop'), item('other', 'method')],
      links: [link('l3', 'reads', 'get->other'), link('l4', 'reads', 'stray->get')],
    });

    it('drops the item together with the edges and links that use it', () => {
      const broken = diagramOf(
        [page, service],
        [
          edge('e1', 'calls', 'Page/onAdd->Api/get'),
          edge('e2', 'passes-prop', 'Page/cartItems->Api/stray'),
        ],
      );
      const { diagram, dropped } = repairDiagram(broken);
      expect(ids(diagram.nodes[1]?.items ?? [])).toEqual(['get', 'other']);
      expect(ids(diagram.nodes[1]?.links ?? [])).toEqual(['l3']);
      expect(ids(diagram.edges)).toEqual(['e1']);
      // The stray item, its link and its edge, plus Page's dangling link l2.
      expect(dropped).toBe(4);
    });
  });

  describe('edges the endpoints do not allow', () => {
    it('drops an edge whose kind its endpoints refuse', () => {
      const broken = diagramOf([list, useCart], [edge('e1', 'renders', 'List->useCart')]);
      const { diagram, dropped } = repairDiagram(broken);
      expect(diagram.edges).toEqual([]);
      expect(dropped).toBe(1);
    });

    it('drops an edge between items of the same node', () => {
      const broken = diagramOf([page], [edge('e1', 'passes-prop', 'Page/cartItems->Page/onAdd')]);
      expect(repairDiagram(broken).diagram.edges).toEqual([]);
    });

    it('keeps a binds-hook edge listed before the uses-hook edge it relies on', () => {
      const sound = diagramOf(
        [page, useCart],
        [
          edge('e1', 'binds-hook', 'Page/cartItems->useCart/cartId'),
          edge('e2', 'uses-hook', 'Page->useCart'),
        ],
      );
      const { diagram } = repairDiagram(sound);
      expect(ids(diagram.edges)).toEqual(['e1', 'e2']);
    });

    it('drops a binds-hook edge when no uses-hook edge backs it', () => {
      const broken = diagramOf(
        [page, useCart],
        [edge('e1', 'binds-hook', 'Page/cartItems->useCart/cartId')],
      );
      const { diagram } = repairDiagram(broken);
      expect(diagram.edges).toEqual([]);
    });

    it('keeps the first of two identical edges', () => {
      const twice = diagramOf(
        [page, list],
        [edge('e1', 'renders', 'Page->List'), edge('e2', 'renders', 'Page->List')],
      );
      expect(ids(repairDiagram(twice).diagram.edges)).toEqual(['e1']);
    });
  });

  describe('duplicate ids', () => {
    it('keeps the first node and drops later ones', () => {
      const later = { ...node('Page', 'component'), name: 'Impostor' };
      const broken = diagramOf([page, list, later], [edge('e1', 'renders', 'Page->List')]);
      const { diagram, dropped } = repairDiagram(broken);
      expect(diagram.nodes.map((n) => n.name)).toEqual(['Page', 'List']);
      expect(ids(diagram.edges)).toEqual(['e1']);
      // The impostor, plus Page's dangling link l2.
      expect(dropped).toBe(2);
    });

    it('drops an item whose id is already used anywhere in the diagram', () => {
      const other = node('Other', 'component', { items: [item('cartItems', 'prop')] });
      const { diagram } = repairDiagram(diagramOf([page, other]));
      expect(diagram.nodes[1]?.items).toEqual([]);
    });

    it('drops an item repeated inside one node', () => {
      const twin = node('Twin', 'component', { items: [item('a', 'prop'), item('a', 'state')] });
      const { diagram, dropped } = repairDiagram(diagramOf([twin]));
      expect(diagram.nodes[0]?.items.map((i) => i.kind)).toEqual(['prop']);
      expect(dropped).toBe(1);
    });

    it('keeps the first edge and drops later ones with the same id', () => {
      const broken = diagramOf(
        [page, list],
        [
          edge('e1', 'renders', 'Page->List'),
          edge('e1', 'passes-prop', 'Page/cartItems->List/items'),
        ],
      );
      const { diagram } = repairDiagram(broken);
      expect(diagram.edges.map((e) => e.kind)).toEqual(['renders']);
    });

    it('drops a link whose id is already used elsewhere in the diagram', () => {
      const first = node('A', 'component', {
        items: [item('a1', 'state'), item('a2', 'state')],
        links: [link('l1', 'reads', 'a1->a2')],
      });
      const second = node('B', 'component', {
        items: [item('b1', 'state'), item('b2', 'state')],
        links: [link('l1', 'reads', 'b1->b2')],
      });
      const { diagram, dropped } = repairDiagram(diagramOf([first, second]));
      expect(diagram.nodes[1]?.links).toEqual([]);
      expect(dropped).toBe(1);
    });
  });

  describe('ids containing a colon', () => {
    it('drops a node and its edges', () => {
      const bad = node('Pa:ge', 'component');
      const broken = diagramOf([bad, list], [edge('e1', 'renders', 'Pa:ge->List')]);
      const { diagram, dropped } = repairDiagram(broken);
      expect(ids(diagram.nodes)).toEqual(['List']);
      expect(diagram.edges).toEqual([]);
      expect(dropped).toBe(2);
    });

    it('drops an item with its edges and links', () => {
      const bad = node('Bad', 'component', {
        items: [item('a:b', 'state'), item('ok', 'state')],
        links: [link('l1', 'reads', 'a:b->ok')],
      });
      const broken = diagramOf([bad, list], [edge('e1', 'passes-prop', 'Bad/a:b->List/items')]);
      const { diagram, dropped } = repairDiagram(broken);
      expect(ids(diagram.nodes[0]?.items ?? [])).toEqual(['ok']);
      expect(diagram.nodes[0]?.links).toEqual([]);
      expect(diagram.edges).toEqual([]);
      expect(dropped).toBe(3);
    });

    it('drops an edge and a link', () => {
      const withLink = node('Pg', 'component', {
        items: [item('x', 'state'), item('y', 'state')],
        links: [link('l:1', 'reads', 'x->y')],
      });
      const broken = diagramOf([withLink, list], [edge('e:1', 'renders', 'Pg->List')]);
      const { diagram, dropped } = repairDiagram(broken);
      expect(diagram.edges).toEqual([]);
      expect(diagram.nodes[0]?.links).toEqual([]);
      expect(dropped).toBe(2);
    });
  });

  describe('viewport', () => {
    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'resets a viewport with zoom %s without counting it as dropped',
      (zoom) => {
        const broken = { ...diagramOf([list]), viewport: { x: 40, y: 10, zoom } };
        const { diagram, dropped } = repairDiagram(broken);
        expect(diagram.viewport).toEqual(DEFAULT_VIEWPORT);
        expect(dropped).toBe(0);
      },
    );

    it('keeps a usable viewport', () => {
      const moved = { ...diagramOf([list]), viewport: { x: 40, y: 10, zoom: 0.5 } };
      expect(repairDiagram(moved).diagram).toBe(moved);
    });
  });
});
