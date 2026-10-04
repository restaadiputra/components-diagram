import type { AnalyzeOptions, ImportResult } from '../../../application/ports/project-analyzer';
import type { DiagramNode } from '../../../domain/diagram';
import { analyzeProject } from '../analyze-project';

export function run(
  files: Record<string, string>,
  options?: AnalyzeOptions,
): Promise<ImportResult> {
  let next = 0;
  return analyzeProject(files, () => `id${(next++).toString()}`, options);
}

export const named = (result: ImportResult, name: string): DiagramNode | undefined =>
  result.nodes.find((node) => node.name === name);

export const edgeKinds = (result: ImportResult): string[] => result.edges.map((edge) => edge.kind);

export const itemNames = (result: ImportResult, nodeName: string): string[] =>
  named(result, nodeName)?.items.map((item) => item.name) ?? [];
