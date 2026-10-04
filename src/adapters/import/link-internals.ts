import * as ts from 'typescript';
import type { Analysis, DiscoveredNode } from './analysis';

interface Kit {
  analysis: Analysis;
  owner: DiscoveredNode;
}

function dependencyArray(body: ts.Node): ts.ArrayLiteralExpression | undefined {
  const call = ts.isVariableDeclaration(body) ? body.initializer : body;
  if (!call || !ts.isCallExpression(call)) return undefined;
  const deps = call.arguments[1];
  return deps && ts.isArrayLiteralExpression(deps) ? deps : undefined;
}

/** `document.title` and `{ title: 1 }` name a member, not the local `title`. */
function isMemberName(id: ts.Identifier): boolean {
  const { parent } = id;
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === id) ||
    (ts.isPropertyAssignment(parent) && parent.name === id)
  );
}

function identifiersIn(root: ts.Node, skip?: ts.Node): ts.Identifier[] {
  const found: ts.Identifier[] = [];
  const visit = (node: ts.Node): void => {
    if (node === skip) return;
    if (ts.isIdentifier(node) && !isMemberName(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

function linkDependencies(kit: Kit, itemId: string, deps: Set<string>): void {
  for (const name of deps) {
    const target = kit.owner.scope.get(name);
    if (target) kit.analysis.builder.link(kit.owner.nodeId, itemId, target, 'depends-on');
  }
}

function linkItem(kit: Kit, itemId: string, body: ts.Node): void {
  const { owner } = kit;
  const { builder } = kit.analysis;
  const deps = dependencyArray(body);
  const declared = new Set(deps ? identifiersIn(deps).map((id) => id.text) : []);
  linkDependencies(kit, itemId, declared);
  for (const id of identifiersIn(body, deps)) {
    const setter = owner.setters.get(id.text);
    if (setter) {
      builder.link(owner.nodeId, itemId, setter, 'sets');
      continue;
    }
    const target = owner.scope.get(id.text);
    if (target && target !== itemId && !declared.has(id.text)) {
      builder.link(owner.nodeId, itemId, target, 'reads');
    }
  }
}

function linkReturns(analysis: Analysis, owner: DiscoveredNode): void {
  for (const { name, itemId } of owner.returns) {
    // Scope keeps the local a return re-exports, unless the name was only ever returned.
    const source = owner.scope.get(name);
    if (source && source !== itemId && owner.kinds.get(source) !== 'return') {
      analysis.builder.link(owner.nodeId, itemId, source, 'reads');
    }
  }
}

export function linkInternals(analysis: Analysis): void {
  for (const owner of analysis.byDecl.values()) {
    for (const [itemId, body] of owner.bodies) {
      if (owner.kinds.get(itemId) === 'return') continue;
      linkItem({ analysis, owner }, itemId, body);
    }
    linkReturns(analysis, owner);
  }
}
