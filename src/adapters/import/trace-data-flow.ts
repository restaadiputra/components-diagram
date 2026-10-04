import * as ts from 'typescript';
import type { EdgeKind } from '../../domain/diagram';
import { resolveNode, type Analysis, type DiscoveredNode } from './analysis';
import { forEachNode, jsxTag } from './connect-structure';
import { calleeName } from './discover-nodes';

interface Pair {
  owner: DiscoveredNode;
  target: DiscoveredNode;
}

interface Side {
  node: DiscoveredNode;
  itemId: string;
}

type Receiver = [local: string, returnId: string];

// Kind, source and target are the three things an edge is; bundling them would only rename the arguments.
// eslint-disable-next-line max-params
function edgeBetween(analysis: Analysis, kind: EdgeKind, from: Side, to: Side): boolean {
  return analysis.builder.edge(
    kind,
    { nodeId: from.node.nodeId, itemId: from.itemId },
    { nodeId: to.node.nodeId, itemId: to.itemId },
  );
}

function isCallable(analysis: Analysis, expression: ts.Expression): boolean {
  return analysis.checker.getTypeAtLocation(expression).getCallSignatures().length > 0;
}

interface Flow {
  expression: ts.Expression;
  sourceItem: string;
  targetItem: string;
}

/** The identifier in scope that feeds a prop the target actually declares, if both exist. */
function resolveFlow(attribute: ts.JsxAttribute, pair: Pair): Flow | undefined {
  const value = attribute.initializer;
  const expression = value && ts.isJsxExpression(value) ? value.expression : undefined;
  if (!expression || !ts.isIdentifier(expression)) return undefined;
  const name = ts.isIdentifier(attribute.name) ? attribute.name.text : '';
  const sourceItem = pair.owner.scope.get(expression.text);
  const targetItem = pair.target.props.get(name);
  return sourceItem && targetItem ? { expression, sourceItem, targetItem } : undefined;
}

function passAttribute(analysis: Analysis, attribute: ts.JsxAttribute, pair: Pair): void {
  const { counts } = analysis.report;
  const value = attribute.initializer;
  if (!value || !ts.isJsxExpression(value)) return; // string literals carry no data flow
  const flow = resolveFlow(attribute, pair);
  if (!flow) {
    counts.unresolvedProps++;
    return;
  }
  const callback =
    pair.owner.kinds.get(flow.sourceItem) === 'handler' || isCallable(analysis, flow.expression);
  const kind: EdgeKind = callback ? 'passes-callback' : 'passes-prop';
  const from = { node: pair.owner, itemId: flow.sourceItem };
  if (edgeBetween(analysis, kind, from, { node: pair.target, itemId: flow.targetItem })) {
    counts.tracedProps++;
  } else {
    counts.unresolvedProps++;
    analysis.report.add('rejected-edge', attribute);
  }
}

function passProps(
  analysis: Analysis,
  element: ts.JsxOpeningLikeElement,
  owner: DiscoveredNode,
): void {
  const tag = ts.isIdentifier(element.tagName) ? resolveNode(analysis, element.tagName) : undefined;
  if (tag?.kind !== 'component') return;
  for (const attribute of element.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      analysis.report.add('spread-props', attribute);
      analysis.report.counts.unresolvedProps++;
    } else {
      passAttribute(analysis, attribute, { owner, target: tag });
    }
  }
}

function consumedContext(
  analysis: Analysis,
  decl: ts.VariableDeclaration,
): DiscoveredNode | undefined {
  const call = decl.initializer;
  if (!call || !ts.isCallExpression(call) || calleeName(call) !== 'useContext') return undefined;
  const [arg] = call.arguments;
  return arg && ts.isIdentifier(arg) ? resolveNode(analysis, arg) : undefined;
}

function consumeContext(
  analysis: Analysis,
  decl: ts.VariableDeclaration,
  owner: DiscoveredNode,
): void {
  const context = consumedContext(analysis, decl);
  const value = context?.scope.get('value');
  if (!context || !value) return;
  for (const itemId of owner.declItems.get(decl) ?? []) {
    edgeBetween(analysis, 'consumes', { node: context, itemId: value }, { node: owner, itemId });
  }
}

function bindArguments(analysis: Analysis, call: ts.CallExpression, pair: Pair): void {
  call.arguments.forEach((arg, index) => {
    const param = pair.target.params[index];
    const source = ts.isIdentifier(arg) ? pair.owner.scope.get(arg.text) : undefined;
    if (!param || !source) return;
    const from = { node: pair.owner, itemId: source };
    edgeBetween(analysis, 'binds-hook', from, { node: pair.target, itemId: param });
  });
}

function objectReceivers(
  pattern: ts.ObjectBindingPattern,
  hook: DiscoveredNode,
): Receiver[] | undefined {
  const matched: Receiver[] = [];
  for (const element of pattern.elements) {
    const key = (element.propertyName ?? element.name).getText();
    const returnId = hook.returns.find((entry) => entry.name === key)?.itemId;
    if (!ts.isIdentifier(element.name) || !returnId) return undefined;
    matched.push([element.name.text, returnId]);
  }
  return matched;
}

function arrayReceivers(pattern: ts.ArrayBindingPattern, hook: DiscoveredNode): Receiver[] {
  return pattern.elements.flatMap((element, index) => {
    const entry = hook.returns[index];
    return !ts.isOmittedExpression(element) && ts.isIdentifier(element.name) && entry
      ? [[element.name.text, entry.itemId] as Receiver]
      : [];
  });
}

/** Pairs each bound name with the hook return it receives: by property name, by position, or the only one. */
function receivers(decl: ts.VariableDeclaration, hook: DiscoveredNode): Receiver[] | undefined {
  const { name } = decl;
  if (ts.isObjectBindingPattern(name)) return objectReceivers(name, hook);
  if (ts.isArrayBindingPattern(name)) return arrayReceivers(name, hook);
  const [only] = hook.returns;
  return hook.returns.length === 1 && only ? [[name.text, only.itemId]] : undefined;
}

function bindReturns(analysis: Analysis, decl: ts.VariableDeclaration, pair: Pair): void {
  const matched = receivers(decl, pair.target);
  if (!matched) {
    analysis.report.add('untraced-binding', decl);
    return;
  }
  for (const [local, returnId] of matched) {
    const receiver = pair.owner.scope.get(local);
    if (!receiver) continue;
    const from = { node: pair.target, itemId: returnId };
    edgeBetween(analysis, 'binds-hook', from, { node: pair.owner, itemId: receiver });
  }
}

function visitHookUse(analysis: Analysis, node: ts.Node, owner: DiscoveredNode): void {
  const call = ts.isVariableDeclaration(node) ? node.initializer : node;
  if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return;
  const hook = resolveNode(analysis, call.expression);
  if (hook?.kind !== 'hook') return;
  const pair = { owner, target: hook };
  if (ts.isVariableDeclaration(node)) bindReturns(analysis, node, pair);
  else bindArguments(analysis, call, pair);
}

export function traceDataFlow(analysis: Analysis): void {
  forEachNode(analysis, (node, owner) => {
    const element = jsxTag(node);
    if (element) passProps(analysis, element, owner);
    if (ts.isVariableDeclaration(node)) consumeContext(analysis, node, owner);
    visitHookUse(analysis, node, owner);
  });
}
