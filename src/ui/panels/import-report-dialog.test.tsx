import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ImportSummary } from '../../application/diagram-store';
import { groupEntries, ImportReportView } from './import-report-dialog';

const summary: ImportSummary = {
  projectName: 'shop',
  dropped: 2,
  skipped: { tooLarge: 3, tooMany: false },
  report: {
    entries: [
      { kind: 'spread-props', file: 'src/page.tsx', line: 12 },
      { kind: 'hoc', file: 'src/app.tsx', line: 4 },
      { kind: 'spread-props', file: 'src/list.tsx', line: 7 },
    ],
    counts: { nodes: 5, items: 20, edges: 9, tracedProps: 6, unresolvedProps: 2 },
  },
};

describe('import report', () => {
  it('groups entries by kind in a stable order', () => {
    expect(groupEntries(summary.report).map((group) => [group.kind, group.entries.length])).toEqual(
      [
        ['spread-props', 2],
        ['hoc', 1],
      ],
    );
  });

  it('shows the counts, the entries with file and line, and skipped files', () => {
    const html = renderToStaticMarkup(
      <ImportReportView summary={summary} onClose={() => undefined} />,
    );
    expect(html).toContain('shop');
    expect(html).toContain('5 nodes');
    expect(html).toContain('6 props traced');
    expect(html).toContain('2 not resolved');
    expect(html).toContain('src/page.tsx:12');
    expect(html).toContain('3 files over 500 KB were skipped');
  });

  it('is an accessible dialog with a Close button', () => {
    const html = renderToStaticMarkup(
      <ImportReportView summary={summary} onClose={() => undefined} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Import summary');
    expect(html).toContain('>Close<');
  });
});
