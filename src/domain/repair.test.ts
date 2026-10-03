import { describe, expect, it } from 'vitest';
import { dropDanglingReferences } from './repair';
import { diagramOf, edge, item, link, node } from './testing/fixtures';

const page = node('Page', 'component', {
  items: [item('onAdd', 'handler'), item('cartItems', 'state')],
  links: [link('l1', 'sets', 'onAdd->cartItems'), link('l2', 'sets', 'onAdd->ghost')],
});
const list = node('List', 'component', { items: [item('items', 'prop')] });

describe('dropDanglingReferences', () => {
  it('removes edges and links that point at missing nodes or items', () => {
    const broken = diagramOf(
      [page, list],
      [
        edge('e1', 'passes-prop', 'Page/cartItems->List/items'),
        edge('e2', 'passes-prop', 'Page/cartItems->List/ghost'),
        edge('e3', 'renders', 'Page->Ghost'),
      ],
    );
    const { diagram, dropped } = dropDanglingReferences(broken);
    expect(dropped).toBe(3);
    expect(diagram.edges.map((e) => e.id)).toEqual(['e1']);
    expect(diagram.nodes[0]?.links.map((l) => l.id)).toEqual(['l1']);
  });

  it('reports zero for a sound diagram', () => {
    const sound = diagramOf([list], []);
    expect(dropDanglingReferences(sound)).toEqual({ diagram: sound, dropped: 0 });
  });
});
