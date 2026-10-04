import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DiagramWarning } from '../../domain/warnings/types';
import { WarningListView } from './warning-list';

const drilling: DiagramWarning = {
  ruleId: 'prop-drilling',
  target: { nodeId: 'a', itemId: 'user' },
  message: "'user' is forwarded 3 levels without being used in between",
  relatedNodeIds: ['a', 'b', 'c', 'd'],
};
const single: DiagramWarning = {
  ruleId: 'single-consumer-context',
  target: { nodeId: 'theme' },
  message: 'Only Header consumes this context',
  relatedNodeIds: ['h'],
};
const nameOf = (id: string) => id.toUpperCase();

describe('warning list', () => {
  it('renders nothing without warnings', () => {
    expect(renderToStaticMarkup(<WarningListView warnings={[]} nameOf={nameOf} />)).toBe('');
  });

  it('shows the rule label and message', () => {
    const html = renderToStaticMarkup(<WarningListView warnings={[single]} nameOf={nameOf} />);
    expect(html).toContain('Single-consumer context');
    expect(html).toContain('Only Header consumes this context');
  });

  it('shows the chain when more than one node is involved', () => {
    const html = renderToStaticMarkup(<WarningListView warnings={[drilling]} nameOf={nameOf} />);
    expect(html).toContain('A → B → C → D');
  });

  it('does not show a chain for a single related node', () => {
    const html = renderToStaticMarkup(<WarningListView warnings={[single]} nameOf={nameOf} />);
    expect(html).not.toContain('→');
  });
});
