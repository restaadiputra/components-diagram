import { importProject as buildDiagram, type ImportedProject } from './import-project';
import type { DiagramLibrary } from './diagram-library';
import type { DiagramStore } from './diagram-store';
import type { DiagramLayout } from './ports/diagram-layout';
import type { LoadedDiagram } from './ports/diagram-repository';
import { DEFAULT_MAX_FILES, type ProjectAnalyzer } from './ports/project-analyzer';
import type { PickedProject, ProjectSource } from './ports/project-source';

export type SwitchTo = (
  fetch: () => Promise<LoadedDiagram | undefined>,
  describeFailure: (error: unknown) => string,
) => Promise<void>;

export interface ProjectImportDeps {
  store: DiagramStore;
  library: DiagramLibrary;
  projectSource: ProjectSource;
  analyzer: ProjectAnalyzer;
  layout: DiagramLayout;
  newId: () => string;
  now: () => string;
}

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const refusal = (project: PickedProject): string | null => {
  if (project.skipped.tooMany) {
    return 'This project has more than 2,000 source files. Pick a subfolder.';
  }
  return Object.keys(project.files).length === 0
    ? 'No TypeScript or JavaScript files were found.'
    : null;
};

async function pickProject(
  { store, projectSource }: Pick<ProjectImportDeps, 'store' | 'projectSource'>,
  signal: AbortSignal,
): Promise<PickedProject | undefined> {
  const state = () => store.getState();
  state().setImportStatus({ phase: 'reading', files: 0 });
  try {
    return await projectSource.pick({
      maxFiles: DEFAULT_MAX_FILES,
      signal,
      onProgress: (files) => {
        state().setImportStatus({ phase: 'reading', files });
      },
    });
  } catch (error) {
    state().setNotice(error instanceof Error ? error.message : 'The folder could not be read.');
    return undefined;
  }
}

export function createProjectImport(deps: ProjectImportDeps, switchTo: SwitchTo) {
  const { store, library, analyzer, layout, newId, now } = deps;
  const state = () => store.getState();
  let controller: AbortController | undefined;

  const analyze = async (
    project: PickedProject,
    signal: AbortSignal,
  ): Promise<ImportedProject | undefined> => {
    state().setImportStatus({ phase: 'analyzing' });
    try {
      return await buildDiagram(
        project.files,
        { analyze: analyzer, layout, newId, now, options: { maxFiles: DEFAULT_MAX_FILES, signal } },
        project.name,
      );
    } catch (error) {
      if (!isCancel(error)) state().setNotice('The project could not be analyzed.');
      return undefined;
    }
  };

  const open = async (project: PickedProject, imported: ImportedProject) => {
    let adoptedId: string | undefined;
    await switchTo(
      async () => {
        const diagram = await library.adopt(imported.diagram);
        adoptedId = diagram.id;
        return { diagram, droppedReferences: imported.dropped };
      },
      () => 'The project could not be imported.',
    );
    // The switch may have been refused (unsaved changes); only then is there nothing to summarize.
    if (adoptedId !== undefined && state().diagram.id === adoptedId) {
      state().setImportSummary({
        projectName: project.name,
        report: imported.report,
        dropped: imported.dropped,
        skipped: project.skipped,
      });
    }
  };

  const run = async (signal: AbortSignal) => {
    const project = await pickProject(deps, signal);
    if (!project) return;
    const refused = refusal(project);
    if (refused) {
      state().setNotice(refused);
      return;
    }
    const imported = await analyze(project, signal);
    if (imported) await open(project, imported);
  };

  return {
    importProject: async () => {
      if (controller) return;
      controller = new AbortController();
      try {
        await run(controller.signal);
      } finally {
        controller = undefined;
        state().setImportStatus({ phase: 'idle' });
      }
    },
    cancelImport: () => {
      controller?.abort();
    },
  };
}
