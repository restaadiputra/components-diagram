import { describe, expect, it } from 'vitest';
import {
  createBrowserProjectSource,
  type DirEntry,
  type FileEntry,
} from './browser-project-source';

const file = (name: string, text: string, size = text.length): FileEntry => ({
  kind: 'file',
  name,
  getFile: () => Promise.resolve({ size, text: () => Promise.resolve(text) }),
});
const dir = (name: string, entries: (FileEntry | DirEntry)[]): DirEntry => ({
  kind: 'directory',
  name,
  values: async function* () {
    await Promise.resolve();
    yield* entries;
  },
});
const sourceOf = (root: DirEntry) =>
  createBrowserProjectSource({ showDirectoryPicker: () => Promise.resolve(root) });

describe('browser project source', () => {
  it('reads source files with relative paths and skips everything else', async () => {
    const root = dir('shop', [
      dir('src', [
        file('app.tsx', 'a'),
        file('util.ts', 'b'),
        file('types.d.ts', 'c'),
        file('style.css', 'd'),
      ]),
      dir('node_modules', [file('x.js', 'e')]),
      dir('dist', [file('y.js', 'f')]),
      file('README.md', 'g'),
    ]);
    const picked = await sourceOf(root).pick();
    expect(picked?.name).toBe('shop');
    expect(Object.keys(picked?.files ?? {}).sort()).toEqual(['src/app.tsx', 'src/util.ts']);
  });

  it('skips files over 500 KB and counts them', async () => {
    const root = dir('p', [file('big.ts', 'x', 600_000), file('ok.ts', 'y')]);
    const picked = await sourceOf(root).pick();
    expect(Object.keys(picked?.files ?? {})).toEqual(['ok.ts']);
    expect(picked?.skipped.tooLarge).toBe(1);
  });

  it('stops at the file limit and says so', async () => {
    const root = dir('p', [file('a.ts', '1'), file('b.ts', '2'), file('c.ts', '3')]);
    const picked = await sourceOf(root).pick({ maxFiles: 2 });
    expect(Object.keys(picked?.files ?? {})).toHaveLength(2);
    expect(picked?.skipped.tooMany).toBe(true);
  });

  it('reports progress as files are read', async () => {
    const counts: number[] = [];
    await sourceOf(dir('p', [file('a.ts', '1'), file('b.ts', '2')])).pick({
      onProgress: (n) => counts.push(n),
    });
    expect(counts).toEqual([1, 2]);
  });

  it('resolves undefined when the user cancels the picker', async () => {
    const source = createBrowserProjectSource({
      showDirectoryPicker: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    });
    expect(await source.pick()).toBeUndefined();
  });

  it('resolves undefined when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const root = dir('p', [file('a.ts', '1')]);
    expect(await sourceOf(root).pick({ signal: controller.signal })).toBeUndefined();
  });

  it('turns any other failure into a readable error', async () => {
    const source = createBrowserProjectSource({
      showDirectoryPicker: () => Promise.reject(new Error('boom')),
    });
    await expect(source.pick()).rejects.toThrow('The folder could not be read.');
  });

  it('is unsupported when the browser has no picker', async () => {
    const source = createBrowserProjectSource({});
    expect(source.supported).toBe(false);
    await expect(source.pick()).rejects.toThrow('The folder could not be read.');
  });
});
