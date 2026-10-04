import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, node } from '../testing/fixtures';
import { findWarnings } from './find-warnings';

describe('findWarnings', () => {
  it('runs every registered rule', () => {
    const items = Array.from({ length: 13 }, (_, index) => item(`s${index.toString()}`, 'state'));
    const diagram = diagramOf(
      [
        node('Big', 'component', { items: [...items, item('user', 'state')] }),
        node('L1', 'component', { items: [item('p1', 'prop')] }),
        node('L2', 'component', { items: [item('p2', 'prop')] }),
        node('L3', 'component', { items: [item('p3', 'prop')] }),
        node('Theme', 'context', { items: [item('current', 'value')] }),
        node('Only', 'component', { items: [item('mode', 'state')] }),
      ],
      [
        edge('e1', 'passes-prop', 'Big/user->L1/p1'),
        edge('e2', 'passes-prop', 'L1/p1->L2/p2'),
        edge('e3', 'passes-prop', 'L2/p2->L3/p3'),
        edge('e4', 'consumes', 'Theme/current->Only/mode'),
      ],
    );
    expect(
      findWarnings(diagram)
        .map((warning) => warning.ruleId)
        .sort(),
    ).toEqual(['overloaded-component', 'prop-drilling', 'single-consumer-context']);
  });

  it('is empty for an empty diagram', () => {
    expect(findWarnings(diagramOf([]))).toEqual([]);
  });
});
