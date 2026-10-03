import { describe, expect, it } from 'vitest';
import { diagramOf, edge, ep, item, node } from '../../domain/testing/fixtures';
import { trace } from '../../domain/trace';
import { endpointsOf, isInvalidTarget } from './from-flow';
import { handleId, toEndpoint } from './handle-ids';
import { applyOverlayChanges, clearPositions, committedMoves, emptyOverlay } from './node-overlay';
import { toFlowEdges, toFlowNodes, type CanvasView } from './to-flow';

const page = node('Page', 'component', { items: [item('cartItems', 'state')] });
const list = node('List', 'component', { items: [item('items', 'prop')] });
const footer = {
  ...node('Footer', 'component', { items: [item('year', 'prop')] }),
  collapsed: true,
};
const diagram = diagramOf(
  [page, list, footer],
  [
    edge('e1', 'renders', 'Page->List'),
    edge('e2', 'passes-prop', 'Page/cartItems->List/items'),
    edge('e3', 'passes-prop', 'Page/cartItems->Footer/year'),
  ],
);
const view: CanvasView = { selection: null, traceResult: null, overlay: emptyOverlay };

describe('handle ids', () => {
  it('round-trips node and item endpoints', () => {
    expect(handleId('in')).toBe('in:node');
    expect(handleId('out', 'cartItems')).toBe('out:cartItems');
    expect(toEndpoint('Page', 'out:cartItems')).toEqual({ nodeId: 'Page', itemId: 'cartItems' });
    expect(toEndpoint('Page', 'in:node')).toEqual({ nodeId: 'Page' });
    expect(toEndpoint('Page', null)).toEqual({ nodeId: 'Page' });
  });
});

describe('node overlay', () => {
  it('collects drag positions and measured sizes, ignoring other changes', () => {
    const overlay = applyOverlayChanges(emptyOverlay, [
      { type: 'position', id: 'Page', position: { x: 5, y: 6 }, dragging: true },
      { type: 'dimensions', id: 'Page', dimensions: { width: 200, height: 80 } },
      { type: 'select', id: 'Page', selected: true },
    ]);
    expect(overlay).toEqual({
      positions: { Page: { x: 5, y: 6 } },
      measured: { Page: { width: 200, height: 80 } },
    });
  });

  it('clears positions for the given nodes only', () => {
    const overlay = { positions: { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }, measured: {} };
    expect(clearPositions(overlay, ['a']).positions).toEqual({ b: { x: 2, y: 2 } });
  });

  it('commits moves that are not mid-drag (drag end, keyboard nudge)', () => {
    expect(
      committedMoves([
        { type: 'position', id: 'a', position: { x: 1, y: 1 }, dragging: true },
        { type: 'position', id: 'b', position: { x: 2, y: 2 }, dragging: false },
        { type: 'position', id: 'c', position: { x: 3, y: 3 } },
        { type: 'select', id: 'd', selected: true },
      ]),
    ).toEqual([
      { nodeId: 'b', position: { x: 2, y: 2 } },
      { nodeId: 'c', position: { x: 3, y: 3 } },
    ]);
  });
});

describe('toFlowNodes', () => {
  it('maps each node, carrying the domain node as data', () => {
    const [first] = toFlowNodes(diagram, view);
    expect(first).toMatchObject({ id: 'Page', type: 'diagram', position: { x: 0, y: 0 } });
    expect(first?.data.node).toBe(page);
    expect(first?.selected).toBe(false);
  });

  it('prefers the overlay position and passes the measured size through', () => {
    const overlay = {
      positions: { Page: { x: 9, y: 9 } },
      measured: { Page: { width: 200, height: 80 } },
    };
    const [first] = toFlowNodes(diagram, { ...view, overlay });
    expect(first?.position).toEqual({ x: 9, y: 9 });
    expect(first?.measured).toEqual({ width: 200, height: 80 });
  });

  it('marks the selected node', () => {
    const selected = toFlowNodes(diagram, { ...view, selection: { type: 'node', nodeId: 'List' } });
    expect(selected.map((n) => n.selected)).toEqual([false, true, false]);
  });
});

describe('toFlowEdges', () => {
  it('attaches edges to node or item handles and styles them by kind', () => {
    const [renders, prop] = toFlowEdges(diagram, view);
    expect(renders).toMatchObject({
      id: 'e1',
      source: 'Page',
      target: 'List',
      sourceHandle: 'out:node',
      targetHandle: 'in:node',
    });
    expect(prop).toMatchObject({ sourceHandle: 'out:cartItems', targetHandle: 'in:items' });
    expect(prop?.style?.stroke).toBe('#2563eb');
  });

  it('attaches to the header of a collapsed node', () => {
    expect(toFlowEdges(diagram, view)[2]?.targetHandle).toBe('in:node');
  });

  it('dims edges outside the active trace', () => {
    const traced = toFlowEdges(diagram, { ...view, traceResult: trace(diagram, 'items') });
    expect(traced.map((e) => e.style?.opacity)).toEqual([0.15, 1, 0.15]);
  });
});

describe('from-flow', () => {
  it('converts a React Flow connection into endpoints', () => {
    const connection = {
      source: 'Page',
      target: 'List',
      sourceHandle: 'out:cartItems',
      targetHandle: 'in:items',
    };
    expect(endpointsOf(connection)).toEqual({
      source: ep('Page/cartItems'),
      target: ep('List/items'),
    });
  });

  it('knows which targets are invalid for a drag in either direction', () => {
    const fromState = { endpoint: ep('Page/cartItems'), side: 'source' as const };
    expect(isInvalidTarget(diagramOf([page, list]), fromState, ep('List/items'))).toBe(false);
    expect(isInvalidTarget(diagramOf([page, list]), fromState, ep('List'))).toBe(true);
    const fromProp = { endpoint: ep('List/items'), side: 'target' as const };
    expect(isInvalidTarget(diagramOf([page, list]), fromProp, ep('Page/cartItems'))).toBe(false);
  });
});
