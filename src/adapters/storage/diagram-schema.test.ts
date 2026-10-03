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
