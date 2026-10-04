import type { DiagramEdge, DiagramNode } from '../../domain/diagram';

export type SourceFiles = Readonly<Record<string, string>>;

export const REPORT_ENTRY_KINDS = [
  'spread-props',
  'hoc',
  'dynamic-component',
  'unresolved-import',
  'syntax-error',
  'rejected-edge',
  'untraced-binding',
  'file-limit',
] as const;
export type ReportEntryKind = (typeof REPORT_ENTRY_KINDS)[number];

export interface ReportEntry {
  kind: ReportEntryKind;
  file: string;
  line: number;
}

export interface ImportCounts {
  nodes: number;
  items: number;
  edges: number;
  tracedProps: number;
  unresolvedProps: number;
}

export interface ImportReport {
  entries: ReportEntry[];
  counts: ImportCounts;
}

/** Nodes and edges only; the caller owns the diagram's name, id and timestamps. */
export interface ImportResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  report: ImportReport;
}

export interface AnalyzeOptions {
  maxFiles?: number;
}

export type ProjectAnalyzer = (
  files: SourceFiles,
  newId: () => string,
  options?: AnalyzeOptions,
) => Promise<ImportResult>;
