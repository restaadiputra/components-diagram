import { describe, expect, it } from 'vitest';
import { diagramOf, item, link, node } from '../../domain/testing/fixtures';
import { linkItems } from './link-items';
import { unlinkItems } from './unlink-items';

const page = node('Page', 'component', {
  items: [item('onAdd', 'handler'), item('cartItems', 'state')],
  links: [link('l1', 'sets', 'onAdd->cartItems')],
});
const diagram = diagramOf([page]);

describe('linkItems', () => {
  it('adds a link between two items of the node', () => {
    const next = linkItems(diagram, {
      nodeId: 'Page',
      link: link('l2', 'reads', 'onAdd->cartItems'),
    });
    expect(next.nodes[0]?.links.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  it('refuses a duplicate, a self link and a link to a missing item', () => {
    const attempts = [
      link('l2', 'sets', 'onAdd->cartItems'),
      link('l3', 'reads', 'onAdd->onAdd'),
      link('l4', 'reads', 'onAdd->ghost'),
    ];
    for (const attempt of attempts) {
      expect(linkItems(diagram, { nodeId: 'Page', link: attempt })).toBe(diagram);
    }
  });

  it('returns the same diagram when the node does not exist', () => {
    const input = { nodeId: 'ghost', link: link('l2', 'reads', 'onAdd->cartItems') };
    expect(linkItems(diagram, input)).toBe(diagram);
  });

  it('refuses an id already used by a link, in any node', () => {
    const other = node('Other', 'component', { items: [item('a', 'state'), item('b', 'state')] });
    const both = diagramOf([page, other]);
    const reused = link('l1', 'reads', 'a->b');
    expect(linkItems(both, { nodeId: 'Other', link: reused })).toBe(both);
  });
});

describe('unlinkItems', () => {
  it('removes a link', () => {
    expect(unlinkItems(diagram, { nodeId: 'Page', linkId: 'l1' }).nodes[0]?.links).toEqual([]);
  });

  it('returns the same diagram when the link does not exist', () => {
    expect(unlinkItems(diagram, { nodeId: 'Page', linkId: 'ghost' })).toBe(diagram);
  });

  it('returns the same diagram when the node does not exist', () => {
    expect(unlinkItems(diagram, { nodeId: 'ghost', linkId: 'l1' })).toBe(diagram);
  });
});
