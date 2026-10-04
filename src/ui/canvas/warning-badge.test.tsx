import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DiagramWarning } from '../../domain/warnings/types';
import { WarningBadge } from './warning-badge';

const warning = (message: string): DiagramWarning => ({
  ruleId: 'overloaded-component',
  target: { nodeId: 'Page' },
  message,
  relatedNodeIds: [],
});

describe('warning badge', () => {
  it('renders nothing without warnings', () => {
    expect(renderToStaticMarkup(<WarningBadge warnings={[]} />)).toBe('');
  });

  it('labels a single warning with its message', () => {
    const html = renderToStaticMarkup(<WarningBadge warnings={[warning('Too big')]} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Too big"');
  });

  it('counts the rest when there are several', () => {
    const html = renderToStaticMarkup(<WarningBadge warnings={[warning('A'), warning('B')]} />);
    expect(html).toContain('aria-label="A (+1 more)"');
  });
});
