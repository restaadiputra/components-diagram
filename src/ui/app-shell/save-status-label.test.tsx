import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SaveStatus } from '../../application/diagram-store';
import { SaveStatusView } from './save-status-label';

const textOf = (status: SaveStatus) => renderToStaticMarkup(<SaveStatusView status={status} />);

describe('save status label', () => {
  it.each([
    ['saving', 'Saving…'],
    ['saved', 'Saved'],
    ['failed', 'Save failed — export to keep your work'],
    ['conflict', 'Changed in another tab — export to keep your work'],
  ] as const)('shows the %s wording', (status, wording) => {
    expect(textOf(status)).toContain(`>${wording}<`);
    expect(textOf(status)).toContain('data-testid="save-status"');
  });

  it('flags failed and conflict as problems', () => {
    expect(textOf('conflict')).toContain('text-red-700');
    expect(textOf('failed')).toContain('text-red-700');
    expect(textOf('saved')).not.toContain('text-red-700');
  });
});
