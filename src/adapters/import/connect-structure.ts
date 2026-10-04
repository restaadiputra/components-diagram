import * as ts from 'typescript';
import type { EdgeKind } from '../../domain/diagram';
import { enclosingNode, resolveNode, type Analysis, type DiscoveredNode } from './analysis';
import { calleeName } from './discover-nodes';

export function jsxTag(node: ts.Node): ts.JsxOpeningLikeElement | undefined {
  if (ts.isJsxSelfClosingElement(node)) return node;
  return ts.isJsxOpeningElement(node) ? node : undefined;
}

export function forEachNode(
  analysis: Analysis,
  visit: (node: ts.Node, owner: DiscoveredNode) => void,
): void {
  for (const owner of analysis.byDecl.values()) {
    if (!owner.fn?.body) continue;
    const walk = (node: ts.Node): void => {
      visit(node, owner);
      ts.forEachChild(node, walk);
    };
    walk(owner.fn.body);
  }
}

interface Link {
  kind: EdgeKind;
  from: DiscoveredNode;
  to: DiscoveredNode;
}

function link(analysis: Analysis, { kind, from, to }: Link, at: ts.Node): void {
  if (analysis.builder.edge(kind, { nodeId: from.nodeId }, { nodeId: to.nodeId })) return;
  // A duplicate is expected (the same tag used twice); only a rule violation is worth reporting.
  const duplicate = analysis.builder
    .result()
    .edges.some(
      (edge) =>
        edge.kind === kind &&
        edge.source.nodeId === from.nodeId &&
        edge.target.nodeId === to.nodeId,
    );
  if (!duplicate) analysis.report.add('rejected-edge', at);
}

function tagTarget(analysis: Analysis, tag: ts.JsxTagNameExpression): DiscoveredNode | undefined {
  const name = ts.isPropertyAccessExpression(tag) ? tag.expression : tag;
  return ts.isIdentifier(name) ? resolveNode(analysis, name) : undefined;
}

/** A parameter or variable declared inside a component, as opposed to an import. */
function isLocalBinding(analysis: Analysis, id: ts.Identifier): boolean {
  const declaration = analysis.checker.getSymbolAtLocation(id)?.valueDeclaration;
  return (
    declaration !== undefined &&
    !ts.isImportSpecifier(declaration) &&
    enclosingNode(analysis, declaration) !== undefined
  );
}

function visitJsx(
  analysis: Analysis,
  element: ts.JsxOpeningLikeElement,
  owner: DiscoveredNode,
): void {
  const target = tagTarget(analysis, element.tagName);
  if (target?.kind === 'context')
    link(analysis, { kind: 'provides', from: owner, to: target }, element);
  else if (target?.kind === 'component')
    link(analysis, { kind: 'renders', from: owner, to: target }, element);
  else if (!target && ts.isIdentifier(element.tagName) && /^[A-Z]/.test(element.tagName.text)) {
    if (isLocalBinding(analysis, element.tagName))
      analysis.report.add('dynamic-component', element);
  }
}

function visitCall(analysis: Analysis, call: ts.CallExpression, owner: DiscoveredNode): void {
  if (!ts.isIdentifier(call.expression) || !/^use[A-Z0-9]/.test(calleeName(call) ?? '')) return;
  const hook = resolveNode(analysis, call.expression);
  if (hook?.kind === 'hook') link(analysis, { kind: 'uses-hook', from: owner, to: hook }, call);
}

export function connectStructure(analysis: Analysis): void {
  forEachNode(analysis, (node, owner) => {
    const element = jsxTag(node);
    if (element) visitJsx(analysis, element, owner);
    else if (ts.isCallExpression(node)) visitCall(analysis, node, owner);
  });
}
