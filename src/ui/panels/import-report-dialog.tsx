import { useRef } from 'react';
import type { ImportSummary } from '../../application/diagram-store';
import {
  REPORT_ENTRY_KINDS,
  type ImportReport,
  type ReportEntry,
  type ReportEntryKind,
} from '../../application/ports/project-analyzer';
import { useDiagramState, useServices } from '../app-shell/services-context';
import { useModalFocus } from './use-modal-focus';

const KIND_LABELS: Record<ReportEntryKind, string> = {
  'spread-props': 'Spread props (not traced)',
  hoc: 'Higher-order components (skipped)',
  'dynamic-component': 'Components chosen at runtime',
  'unresolved-import': 'Imports that could not be resolved',
  'syntax-error': 'Files with syntax errors',
  'rejected-edge': 'Connections the model does not allow',
  'untraced-binding': 'Hook results that could not be matched',
  'file-limit': 'Too many files',
};

export function groupEntries(
  report: ImportReport,
): { kind: ReportEntryKind; entries: ReportEntry[] }[] {
  return REPORT_ENTRY_KINDS.map((kind) => ({
    kind,
    entries: report.entries.filter((entry) => entry.kind === kind),
  })).filter((group) => group.entries.length > 0);
}

function EntryGroups({ report }: { report: ImportReport }) {
  return groupEntries(report).map((group) => (
    <section key={group.kind} className="mt-3">
      <h3 className="font-medium">{KIND_LABELS[group.kind]}</h3>
      <ul className="text-slate-600">
        {group.entries.map((entry) => {
          const where = `${entry.file}:${entry.line.toString()}`;
          return <li key={where}>{where}</li>;
        })}
      </ul>
    </section>
  ));
}

export function ImportReportView({
  summary,
  onClose,
}: {
  summary: ImportSummary;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useModalFocus(container, onClose);
  const { counts } = summary.report;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div
        ref={container}
        role="dialog"
        aria-label="Import summary"
        className="max-h-[80vh] w-[32rem] overflow-y-auto rounded bg-white p-4 text-sm shadow-lg"
      >
        <h2 className="mb-2 text-base font-semibold">Import summary</h2>
        <p>
          {summary.projectName}: {counts.nodes.toString()} nodes, {counts.edges.toString()} edges.{' '}
          {counts.tracedProps.toString()} props traced, {counts.unresolvedProps.toString()} not
          resolved.
        </p>
        {summary.dropped > 0 && <p>{summary.dropped.toString()} invalid entries were removed.</p>}
        {summary.skipped.tooLarge > 0 && (
          <p>{summary.skipped.tooLarge.toString()} files over 500 KB were skipped.</p>
        )}
        <EntryGroups report={summary.report} />
        <button className="mt-4 rounded border px-2 py-1" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function ImportReportDialog() {
  const summary = useDiagramState((state) => state.importSummary);
  const { store } = useServices();
  if (!summary) return null;
  const close = () => {
    const { counts } = summary.report;
    store.getState().setImportSummary(null);
    store
      .getState()
      .setNotice(
        `Imported ${counts.nodes.toString()} nodes and ${counts.edges.toString()} edges from ${summary.projectName}.`,
      );
  };
  return <ImportReportView summary={summary} onClose={close} />;
}
