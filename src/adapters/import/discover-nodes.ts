import * as ts from 'typescript';
import type { NodeKind } from '../../domain/diagram';
import { newDiscovered, userSourceFiles, type Analysis } from './analysis';

const WRAPPERS = new Set(['memo', 'forwardRef']);
const HOOK_NAME = /^use[A-Z0-9]/;
const PASCAL = /^[A-Z]/;

export function calleeName(call: ts.CallExpression): string | undefined {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
}

function containsJsx(root: ts.Node): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

/** `memo(fn)` and `forwardRef(fn)` are the same component as `fn`. */
function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isCallExpression(current) && WRAPPERS.has(calleeName(current) ?? '')) {
    const [first] = current.arguments;
    if (!first) break;
    current = first;
  }
  return current;
}

function functionOf(expression: ts.Expression): ts.FunctionLikeDeclaration | undefined {
  const inner = unwrap(expression);
  return ts.isArrowFunction(inner) || ts.isFunctionExpression(inner) ? inner : undefined;
}

function kindOfFunction(name: string, fn: ts.FunctionLikeDeclaration): NodeKind | undefined {
  if (HOOK_NAME.test(name)) return 'hook';
  return PASCAL.test(name) && fn.body && containsJsx(fn.body) ? 'component' : undefined;
}

// Five positional values describe one discovered declaration; bundling them would only add a type.
// eslint-disable-next-line max-params
function register(
  analysis: Analysis,
  decl: ts.Node,
  kind: NodeKind,
  name: string,
  fn?: ts.FunctionLikeDeclaration,
): void {
  const nodeId = analysis.builder.node(kind, name);
  analysis.byDecl.set(decl, newDiscovered(nodeId, kind, name, decl, fn));
}

function discoverVariable(analysis: Analysis, decl: ts.VariableDeclaration): void {
  if (!ts.isIdentifier(decl.name) || !decl.initializer) return;
  const name = decl.name.text;
  const fn = functionOf(decl.initializer);
  if (fn) {
    const kind = kindOfFunction(name, fn);
    if (kind) register(analysis, decl, kind, name, fn);
    return;
  }
  const init = decl.initializer;
  if (!ts.isCallExpression(init)) return;
  if (calleeName(init) === 'createContext') {
    register(analysis, decl, 'context', name);
  } else if (PASCAL.test(name) && init.arguments.some(ts.isIdentifier)) {
    analysis.report.add('hoc', decl);
  }
}

function extendsComponent(declaration: ts.ClassDeclaration): boolean {
  return (declaration.heritageClauses ?? []).some((clause) =>
    clause.types.some((type) => /(?:^|\.)(?:Pure)?Component$/.test(type.expression.getText())),
  );
}

function discoverStatement(analysis: Analysis, statement: ts.Statement): void {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    const kind = kindOfFunction(statement.name.text, statement);
    if (kind) register(analysis, statement, kind, statement.name.text, statement);
  } else if (ts.isVariableStatement(statement)) {
    statement.declarationList.declarations.forEach((decl) => {
      discoverVariable(analysis, decl);
    });
  } else if (ts.isClassDeclaration(statement) && statement.name && extendsComponent(statement)) {
    register(analysis, statement, 'component', statement.name.text);
  }
}

export function discoverNodes(analysis: Analysis): void {
  for (const file of userSourceFiles(analysis)) {
    file.statements.forEach((statement) => {
      discoverStatement(analysis, statement);
    });
  }
}
