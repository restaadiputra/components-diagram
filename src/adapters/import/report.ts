import type * as ts from 'typescript';
import type {
  ImportCounts,
  ReportEntry,
  ReportEntryKind,
} from '../../application/ports/project-analyzer';

export interface ReportSink {
  entries: ReportEntry[];
  counts: ImportCounts;
  add(kind: ReportEntryKind, node: ts.Node): void;
  addFile(kind: ReportEntryKind, file: string): void;
}

export function createReport(): ReportSink {
  const entries: ReportEntry[] = [];
  const counts: ImportCounts = { nodes: 0, items: 0, edges: 0, tracedProps: 0, unresolvedProps: 0 };
  return {
    entries,
    counts,
    add(kind, node) {
      const source = node.getSourceFile();
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      entries.push({ kind, file: source.fileName.replace(/^\//, ''), line: line + 1 });
    },
    addFile(kind, file) {
      entries.push({ kind, file, line: 0 });
    },
  };
}
