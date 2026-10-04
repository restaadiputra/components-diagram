import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, node } from '../domain/testing/fixtures';
import type { DiagramWarning } from '../domain/warnings/types';
import { itemWarnings, nodeWarnings, warningsFor } from './diagram-warnings';

const theme = node('Theme', 'context', { items: [item('current', 'value')] });
const header = node('Header', 'component', { items: [item('mode', 'state')] });
const diagram = diagramOf([theme, header], [edge('e1', 'consumes', 'Theme/current->Header/mode')]);

const nodeLevel: DiagramWarning = {
  ruleId: 'overloaded-component',
  target: { nodeId: 'Page' },
  message: 'node level',
  relatedNodeIds: [],
};
const itemLevel: DiagramWarning = {
  ruleId: 'prop-drilling',
  target: { nodeId: 'Page', itemId: 'user' },
  message: 'item level',
  relatedNodeIds: ['Page'],
};

describe('warningsFor', () => {
  it('finds the warnings of a diagram', () => {
    expect(warningsFor(diagram).map((warning) => warning.ruleId)).toEqual([
      'single-consumer-context',
    ]);
  });

  it('returns the same array for the same diagram reference', () => {
    expect(warningsFor(diagram)).toBe(warningsFor(diagram));
  });

  it('recomputes for a new diagram reference', () => {
    expect(warningsFor({ ...diagram })).not.toBe(warningsFor(diagram));
  });
});

describe('nodeWarnings / itemWarnings', () => {
  const page = node('Page', 'component');
  const all = [nodeLevel, itemLevel];

  it('gives a node only its own node-level warnings when expanded', () => {
    expect(nodeWarnings(all, page)).toEqual([nodeLevel]);
  });

  it('rolls item-level warnings up to a collapsed node', () => {
    expect(nodeWarnings(all, { ...page, collapsed: true })).toEqual([nodeLevel, itemLevel]);
  });

  it('ignores other nodes', () => {
    expect(nodeWarnings(all, node('Other', 'component'))).toEqual([]);
  });

  it('selects warnings by item id', () => {
    expect(itemWarnings(all, 'user')).toEqual([itemLevel]);
    expect(itemWarnings(all, 'nope')).toEqual([]);
  });
});
