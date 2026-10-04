import { createDiagram, type Diagram } from '../domain/diagram';
import { repairDiagram } from '../domain/repair';
import type { DiagramLayout } from './ports/diagram-layout';
import type {
  AnalyzeOptions,
  ImportReport,
  ProjectAnalyzer,
  SourceFiles,
} from './ports/project-analyzer';

export interface ImportedProject {
  diagram: Diagram;
  report: ImportReport;
  dropped: number;
}

export interface ImportDeps {
  analyze: ProjectAnalyzer;
  layout: DiagramLayout;
  newId: () => string;
  now: () => string;
  options?: AnalyzeOptions;
}

/** The analyzer has no clock or diagram identity; this is where both are supplied. */
export async function importProject(
  files: SourceFiles,
  deps: ImportDeps,
  name = 'Imported project',
): Promise<ImportedProject> {
  const analyzed = await deps.analyze(files, deps.newId, deps.options);
  const nodes = deps.layout(analyzed.nodes, analyzed.edges);
  const blank = createDiagram(deps.newId(), name, deps.now());
  const { diagram, dropped } = repairDiagram({ ...blank, nodes, edges: analyzed.edges });
  return { diagram, report: analyzed.report, dropped };
}
