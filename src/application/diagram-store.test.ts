import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, node } from '../domain/testing/fixtures';
import { removeItem } from './commands/remove-item';
import { renameDiagram } from './commands/rename-diagram';
import { createDiagramStore } from './diagram-store';

const page = node('Page', 'component', { items: [item('cartItems', 'state')] });
const list = node('List', 'component', { items: [item('items', 'prop')] });
const initial = diagramOf([page, list], [edge('e1', 'passes-prop', 'Page/cartItems->List/items')]);
const NOW = '2026-10-03T12:00:00.000Z';

function setup() {
  const store = createDiagramStore(initial, () => NOW);
  return { store, state: () => store.getState() };
}

describe('diagram store', () => {
  it('applies a command, stamps updatedAt and records history', () => {
    const { state } = setup();
    state().apply((d) => renameDiagram(d, 'Checkout'));
    expect(state().diagram.name).toBe('Checkout');
    expect(state().diagram.updatedAt).toBe(NOW);
    expect(state().history.past).toEqual([initial]);
  });

  it('ignores a command that changes nothing', () => {
    const { state } = setup();
    state().apply((d) => d);
    expect(state().diagram).toBe(initial);
    expect(state().history.past).toEqual([]);
  });

  it('undoes and redoes', () => {
    const { state } = setup();
    state().apply((d) => renameDiagram(d, 'Checkout'));
    state().undo();
    expect(state().diagram.name).toBe('Test');
    state().redo();
    expect(state().diagram.name).toBe('Checkout');
  });

  it('keeps the current viewport when undoing', () => {
    const { state } = setup();
    state().apply((d) => renameDiagram(d, 'Checkout'));
    state().setViewport({ x: 50, y: 60, zoom: 2 });
    state().undo();
    expect(state().diagram.viewport).toEqual({ x: 50, y: 60, zoom: 2 });
  });

  it('changes the viewport without recording history', () => {
    const { state } = setup();
    state().setViewport({ x: 1, y: 2, zoom: 3 });
    expect(state().diagram.viewport).toEqual({ x: 1, y: 2, zoom: 3 });
    expect(state().history.past).toEqual([]);
  });

  it('computes a trace when an item is selected and none otherwise', () => {
    const { state } = setup();
    state().select({ type: 'item', nodeId: 'Page', itemId: 'cartItems' });
    expect(state().traceResult?.edgeIds).toEqual(['e1']);
    state().select({ type: 'node', nodeId: 'Page' });
    expect(state().traceResult).toBeNull();
  });

  it('clears the selection when its target is removed', () => {
    const { state } = setup();
    state().select({ type: 'item', nodeId: 'Page', itemId: 'cartItems' });
    state().apply((d) => removeItem(d, { nodeId: 'Page', itemId: 'cartItems' }));
    expect(state().selection).toBeNull();
    expect(state().traceResult).toBeNull();
  });

  it('loads another diagram with a clean history and selection', () => {
    const { state } = setup();
    state().apply((d) => renameDiagram(d, 'Checkout'));
    state().select({ type: 'node', nodeId: 'Page' });
    const other = { ...diagramOf([]), id: 'd2' };
    state().load(other);
    expect(state().diagram).toBe(other);
    expect(state().history.past).toEqual([]);
    expect(state().selection).toBeNull();
  });

  it('holds the save status and a notice', () => {
    const { state } = setup();
    expect(state().saveStatus).toBe('saved');
    state().setSaveStatus('failed');
    state().setNotice('Something happened');
    expect(state().saveStatus).toBe('failed');
    expect(state().notice).toBe('Something happened');
  });
});
