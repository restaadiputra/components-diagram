import * as ts from 'typescript';
import type { ItemKind, NodeKind } from '../../domain/diagram';
import type { Builder } from './model-builder';
import type { ReportSink } from './report';

export interface DiscoveredNode {
  nodeId: string;
  kind: NodeKind;
  name: string;
  decl: ts.Node;
  fn: ts.FunctionLikeDeclaration | undefined;
  props: Map<string, string>;
  scope: Map<string, string>;
  kinds: Map<string, ItemKind>;
  setters: Map<string, string>;
  params: string[];
  returns: { name: string; itemId: string }[];
  declItems: Map<ts.Node, string[]>;
  bodies: Map<string, ts.Node>;
  mutations: Map<string, string>;
}

export interface Analysis {
  program: ts.Program;
  checker: ts.TypeChecker;
  builder: Builder;
  report: ReportSink;
  byDecl: Map<ts.Node, DiscoveredNode>;
  services: Map<string, { nodeId: string; methods: Map<string, string> }>;
  queries: Map<string, { nodeId: string; itemId: string }>;
}

export function createAnalysis(
  program: ts.Program,
  builder: Builder,
  report: ReportSink,
): Analysis {
  return {
    program,
    checker: program.getTypeChecker(),
    builder,
    report,
    byDecl: new Map(),
    services: new Map(),
    queries: new Map(),
  };
}

// Five positional parameters are the contract later tasks call; an options object would change it.
// eslint-disable-next-line max-params
export function newDiscovered(
  nodeId: string,
  kind: NodeKind,
  name: string,
  decl: ts.Node,
  fn: ts.FunctionLikeDeclaration | undefined,
): DiscoveredNode {
  return {
    nodeId,
    kind,
    name,
    decl,
    fn,
    props: new Map(),
    scope: new Map(),
    kinds: new Map(),
    setters: new Map(),
    params: [],
    returns: [],
    declItems: new Map(),
    bodies: new Map(),
    mutations: new Map(),
  };
}

/** Follows an import alias to the declaration it stands for; undefined for unresolved packages. */
export function resolveDeclaration(analysis: Analysis, id: ts.Node): ts.Declaration | undefined {
  let symbol = analysis.checker.getSymbolAtLocation(id);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias)
    symbol = analysis.checker.getAliasedSymbol(symbol);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
}

export function resolveNode(analysis: Analysis, id: ts.Identifier): DiscoveredNode | undefined {
  const decl = resolveDeclaration(analysis, id);
  return decl ? analysis.byDecl.get(decl) : undefined;
}

export function enclosingNode(analysis: Analysis, from: ts.Node): DiscoveredNode | undefined {
  // The source file is the last node whose parent pointer is meaningful.
  for (let current = from; ; current = current.parent) {
    const found = analysis.byDecl.get(current);
    if (found) return found;
    if (ts.isSourceFile(current)) return undefined;
  }
}

export function userSourceFiles(analysis: Analysis): ts.SourceFile[] {
  return analysis.program
    .getSourceFiles()
    .filter((file) => !file.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}
