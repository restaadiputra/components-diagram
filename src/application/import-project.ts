import { createDiagram, type Diagram } from '../domain/diagram';
import { repairDiagram } from '../domain/repair';
import type { ImportReport, ProjectAnalyzer, SourceFiles } from './ports/project-analyzer';

export interface ImportedProject {
  diagram: Diagram;
  report: ImportReport;
  dropped: number;
}

export interface ImportDeps {
  analyze: ProjectAnalyzer;
  newId: () => string;
  now: () => string;
}

/** The analyzer has no clock or diagram identity; this is where both are supplied. */
export async function importProject(
  files: SourceFiles,
  deps: ImportDeps,
  name = 'Imported project',
): Promise<ImportedProject> {
  const { nodes, edges, report } = await deps.analyze(files, deps.newId);
  const blank = createDiagram(deps.newId(), name, deps.now());
  const { diagram, dropped } = repairDiagram({ ...blank, nodes, edges });
  return { diagram, report, dropped };
}
