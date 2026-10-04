import * as ts from 'typescript';
import type { SourceFiles } from '../../application/ports/project-analyzer';

const toHostPath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

/** The program only needs symbols and imports resolved, so no lib or type packages are loaded. */
export function createProgram(files: SourceFiles): ts.Program {
  const hostFiles = new Map(Object.entries(files).map(([path, text]) => [toHostPath(path), text]));
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    noEmit: true,
    noLib: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host: ts.CompilerHost = {
    getSourceFile: (name, languageVersion) => {
      const text = hostFiles.get(name);
      // Parent pointers are needed to walk from a node up to its component.
      return text === undefined
        ? undefined
        : ts.createSourceFile(name, text, languageVersion, true);
    },
    getDefaultLibFileName: () => '/lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    fileExists: (name) => hostFiles.has(name),
    directoryExists: (dir) => [...hostFiles.keys()].some((file) => file.startsWith(`${dir}/`)),
    readFile: (name) => hostFiles.get(name),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  return ts.createProgram([...hostFiles.keys()].sort(), options, host);
}
