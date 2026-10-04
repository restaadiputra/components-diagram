import * as ts from 'typescript';
import {
  DEFAULT_MAX_FILES,
  type ImportResult,
  type ProjectAnalyzer,
} from '../../application/ports/project-analyzer';
import { createAnalysis, userSourceFiles, type Analysis } from './analysis';
import { createProgram } from './create-program';
import { discoverNodes } from './discover-nodes';
import { extractItems } from './extract-items';
import { connectStructure } from './connect-structure';
import { detectServices } from './detect-services';
import { linkInternals } from './link-internals';
import { createBuilder } from './model-builder';
import { createReport } from './report';
import { traceDataFlow } from './trace-data-flow';

export { DEFAULT_MAX_FILES };

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;

function reportFileProblems(analysis: Analysis): void {
  for (const file of userSourceFiles(analysis)) {
    for (const diagnostic of analysis.program.getSyntacticDiagnostics(file)) {
      const { line } = file.getLineAndCharacterOfPosition(diagnostic.start);
      analysis.report.entries.push({
        kind: 'syntax-error',
        file: file.fileName.replace(/^\//, ''),
        line: line + 1,
      });
    }
    reportUnresolvedImports(analysis, file);
  }
}

/** Packages are opaque on purpose; only a relative import that fails is a real gap. */
function reportUnresolvedImports(analysis: Analysis, file: ts.SourceFile): void {
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (!statement.moduleSpecifier.text.startsWith('.')) continue;
    if (!analysis.checker.getSymbolAtLocation(statement.moduleSpecifier)) {
      analysis.report.add('unresolved-import', statement);
    }
  }
}

function finish(analysis: Analysis): ImportResult {
  const { nodes, edges } = analysis.builder.result();
  const { counts } = analysis.report;
  counts.nodes = nodes.length;
  counts.edges = edges.length;
  counts.items = nodes.reduce((sum, node) => sum + node.items.length, 0);
  return { nodes, edges, report: { entries: analysis.report.entries, counts } };
}

export const analyzeProject: ProjectAnalyzer = (files, newId, options = {}) => {
  const sources = Object.fromEntries(
    Object.entries(files).filter(([path]) => SOURCE_FILE.test(path)),
  );
  const report = createReport();
  if (Object.keys(sources).length > (options.maxFiles ?? DEFAULT_MAX_FILES)) {
    report.addFile('file-limit', '');
    return Promise.resolve({
      nodes: [],
      edges: [],
      report: { entries: report.entries, counts: report.counts },
    });
  }
  const analysis = createAnalysis(createProgram(sources), createBuilder(newId), report);
  reportFileProblems(analysis);
  discoverNodes(analysis);
  extractItems(analysis);
  connectStructure(analysis);
  traceDataFlow(analysis);
  detectServices(analysis);
  linkInternals(analysis);
  return Promise.resolve(finish(analysis));
};
