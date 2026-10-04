import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, node } from '../testing/fixtures';
import { singleConsumerContext } from './single-consumer-context';
import { WARNING_THRESHOLDS } from './types';

const theme = node('Theme', 'context', { items: [item('current', 'value')] });
const header = node('Header', 'component', { items: [item('mode', 'state')] });
const footer = node('Footer', 'component', { items: [item('look', 'state')] });
const headerEdge = edge('e1', 'consumes', 'Theme/current->Header/mode');
const footerEdge = edge('e2', 'consumes', 'Theme/current->Footer/look');

const run = (edges: ReturnType<typeof edge>[]) =>
  singleConsumerContext(diagramOf([theme, header, footer], edges), WARNING_THRESHOLDS);

describe('single-consumer-context', () => {
  it('stays quiet while nothing consumes the context yet', () => {
    expect(run([])).toEqual([]);
  });

  it('warns when exactly one node consumes it', () => {
    expect(run([headerEdge])).toEqual([
      {
        ruleId: 'single-consumer-context',
        target: { nodeId: 'Theme' },
        message: 'Only Header consumes this context',
        relatedNodeIds: ['Header'],
      },
    ]);
  });

  it('counts a node once however many of its items consume', () => {
    const second = edge('e3', 'consumes', 'Theme/current->Header/mode');
    expect(run([headerEdge, second])).toHaveLength(1);
  });

  it('stays quiet with two consuming nodes', () => {
    expect(run([headerEdge, footerEdge])).toEqual([]);
  });
});
