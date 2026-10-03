import { describe, expect, it } from 'vitest';
import { parseDiagram } from './diagram-schema';
import fixture from './fixtures/v1-diagram.json';
import { jsonDiagramCodec } from './json-diagram-codec';

describe('parseDiagram', () => {
  it('accepts a version 1 file unchanged', () => {
    expect(parseDiagram(fixture)).toEqual({ ok: true, diagram: fixture, droppedReferences: 0 });
  });

  it('rejects something that is not a diagram', () => {
    expect(parseDiagram({ hello: 'world' })).toEqual({
      ok: false,
      reason: 'This is not a diagram file: it has no schemaVersion.',
    });
  });

  it('refuses a file from a newer version instead of dropping data', () => {
    const result = parseDiagram({ ...fixture, schemaVersion: 2 });
    expect(result).toEqual({
      ok: false,
      reason:
        'This diagram was saved by a newer version of the app (format 2). Update the app to open it.',
    });
  });

  it('names the field that is wrong', () => {
    const result = parseDiagram({ ...fixture, nodes: [{ ...fixture.nodes[0], kind: 'widget' }] });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toContain('nodes.0.kind');
  });

  it('drops references to missing items and counts them', () => {
    const edges = [
      ...fixture.edges,
      { id: 'e-3', kind: 'renders', source: { nodeId: 'n-page' }, target: { nodeId: 'ghost' } },
    ];
    const result = parseDiagram({ ...fixture, edges });
    expect(result.ok && result.droppedReferences).toBe(1);
    expect(result.ok && result.diagram.edges.map((edge) => edge.id)).toEqual(['e-1', 'e-2']);
  });

  describe('domain-invalid content', () => {
    const [page, list] = fixture.nodes;
    const dropped = (result: ReturnType<typeof parseDiagram>) =>
      result.ok && result.droppedReferences;

    it('drops an item its node kind does not allow', () => {
      const stray = { id: 'i-stray', kind: 'method', name: 'stray' };
      const nodes = [{ ...page, items: [...(page?.items ?? []), stray] }, list];
      const result = parseDiagram({ ...fixture, nodes });
      expect(dropped(result)).toBe(1);
      expect(result.ok && result.diagram.nodes[0]?.items.map((i) => i.id)).toEqual([
        'i-on-add',
        'i-cart-items',
      ]);
    });

    it('drops an edge its endpoints do not allow', () => {
      const bad = {
        id: 'e-bad',
        kind: 'provides',
        source: { nodeId: 'n-page' },
        target: { nodeId: 'n-list' },
      };
      const result = parseDiagram({ ...fixture, edges: [...fixture.edges, bad] });
      expect(dropped(result)).toBe(1);
      expect(result.ok && result.diagram.edges.map((e) => e.id)).toEqual(['e-1', 'e-2']);
    });

    it('keeps the first of two nodes sharing an id', () => {
      const twin = { ...list, name: 'Twin', items: [], links: [] };
      const result = parseDiagram({ ...fixture, nodes: [...fixture.nodes, twin] });
      expect(dropped(result)).toBe(1);
      expect(result.ok && result.diagram.nodes.map((n) => n.name)).toEqual([
        'CartPage',
        'CartList',
      ]);
    });

    it('drops an entity whose id contains a colon', () => {
      const nodes = [{ ...page, id: 'n:page' }, list];
      const result = parseDiagram({ ...fixture, nodes });
      expect(result.ok && result.diagram.nodes.map((n) => n.id)).toEqual(['n-list']);
      expect(dropped(result)).toBeGreaterThan(0);
    });

    it('resets an unusable zoom without counting it as dropped', () => {
      const result = parseDiagram({ ...fixture, viewport: { x: 10, y: 20, zoom: 0 } });
      expect(dropped(result)).toBe(0);
      expect(result.ok && result.diagram.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });
});

describe('jsonDiagramCodec', () => {
  it('rejects text that is not JSON', () => {
    expect(jsonDiagramCodec.parse('not json')).toEqual({
      ok: false,
      reason: 'This file is not valid JSON.',
    });
  });

  it('round-trips a diagram through text', () => {
    const parsed = jsonDiagramCodec.parse(JSON.stringify(fixture));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(jsonDiagramCodec.parse(jsonDiagramCodec.serialize(parsed.diagram))).toEqual(parsed);
  });
});
