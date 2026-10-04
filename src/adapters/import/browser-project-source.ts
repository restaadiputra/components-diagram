import { DEFAULT_MAX_FILES } from '../../application/ports/project-analyzer';
import type {
  PickedProject,
  PickOptions,
  ProjectSource,
} from '../../application/ports/project-source';

export interface FileEntry {
  kind: 'file';
  name: string;
  getFile: () => Promise<{ size: number; text: () => Promise<string> }>;
}
export interface DirEntry {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<FileEntry | DirEntry>;
}
export interface PickerHost {
  showDirectoryPicker?: (options: { mode: 'read' }) => Promise<DirEntry>;
}

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
]);
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const DECLARATION_FILE = /\.d\.[cm]?ts$/;
const MAX_FILE_BYTES = 500_000;
const READ_ERROR = 'The folder could not be read.';

interface Walk {
  files: Record<string, string>;
  skipped: PickedProject['skipped'];
  limit: number;
  onProgress: ((filesRead: number) => void) | undefined;
  signal: AbortSignal | undefined;
  count: number;
}

async function readFile(entry: FileEntry, path: string, walk: Walk): Promise<void> {
  if (!SOURCE_FILE.test(entry.name) || DECLARATION_FILE.test(entry.name)) return;
  const file = await entry.getFile();
  if (file.size > MAX_FILE_BYTES) {
    walk.skipped.tooLarge++;
    return;
  }
  if (walk.count >= walk.limit) {
    walk.skipped.tooMany = true;
    return;
  }
  walk.files[path] = await file.text();
  walk.count++;
  walk.onProgress?.(walk.count);
}

async function walkDirectory(dir: DirEntry, prefix: string, walk: Walk): Promise<void> {
  for await (const entry of dir.values()) {
    if (walk.signal?.aborted || walk.skipped.tooMany) return;
    if (entry.kind === 'file') await readFile(entry, `${prefix}${entry.name}`, walk);
    else if (!SKIPPED_DIRECTORIES.has(entry.name))
      await walkDirectory(entry, `${prefix}${entry.name}/`, walk);
  }
}

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

async function readProject(
  root: DirEntry,
  options: PickOptions,
): Promise<PickedProject | undefined> {
  const walk: Walk = {
    files: {},
    skipped: { tooLarge: 0, tooMany: false },
    limit: options.maxFiles ?? DEFAULT_MAX_FILES,
    onProgress: options.onProgress,
    signal: options.signal,
    count: 0,
  };
  await walkDirectory(root, '', walk);
  if (options.signal?.aborted) return undefined;
  return { name: root.name, files: walk.files, skipped: walk.skipped };
}

export function createBrowserProjectSource(host: PickerHost): ProjectSource {
  const picker = host.showDirectoryPicker;
  return {
    supported: picker !== undefined,
    pick: async (options = {}) => {
      if (!picker) throw new Error(READ_ERROR);
      try {
        // Called as a method: the browser's picker rejects a detached call.
        return await readProject(await picker.call(host, { mode: 'read' }), options);
      } catch (error) {
        if (isCancel(error)) return undefined;
        throw new Error(READ_ERROR, { cause: error });
      }
    },
  };
}
