import * as ts from 'typescript';
import { enclosingNode, resolveDeclaration, type Analysis, type DiscoveredNode } from './analysis';
import { forEachNode } from './connect-structure';
import { calleeName } from './discover-nodes';

const QUERY_HOOKS = new Set(['useQuery', 'useSuspenseQuery', 'useSWR']);
const MUTATION_HOOKS = new Set(['useMutation']);

interface Site {
  nodeId: string;
  itemId: string;
}

/** First string literal in an argument: `'k'`, `['k', id]` or `{ queryKey: ['k'] }`. */
function firstKey(argument: ts.Expression | undefined): string | undefined {
  if (!argument) return undefined;
  let found: string | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (ts.isStringLiteralLike(node)) found = node.text;
    else ts.forEachChild(node, visit);
  };
  if (ts.isObjectLiteralExpression(argument)) {
    const keyProp = argument.properties.find((p) => p.name?.getText() === 'queryKey');
    if (keyProp && ts.isPropertyAssignment(keyProp)) visit(keyProp.initializer);
  } else visit(argument);
  return found;
}

function queryFor(analysis: Analysis, key: string, kind: 'query' | 'cache-key'): Site | undefined {
  const known = analysis.queries.get(key);
  if (known) return known;
  const nodeId = analysis.builder.node('query-cache', key);
  const itemId = analysis.builder.item(nodeId, kind, key);
  if (!itemId) return undefined;
  const created = { nodeId, itemId };
  analysis.queries.set(key, created);
  return created;
}

function declaredCall(
  decl: ts.Node,
  names: ReadonlySet<string>,
): { decl: ts.VariableDeclaration; call: ts.CallExpression } | undefined {
  if (!ts.isVariableDeclaration(decl)) return undefined;
  const call = decl.initializer;
  if (!call || !ts.isCallExpression(call)) return undefined;
  return names.has(calleeName(call) ?? '') ? { decl, call } : undefined;
}

function connectQueries(analysis: Analysis): void {
  forEachNode(analysis, (node, owner) => {
    const found = declaredCall(node, QUERY_HOOKS);
    const key = found && firstKey(found.call.arguments[0]);
    if (!found || key === undefined) return;
    const query = queryFor(analysis, key, 'query');
    if (!query) return;
    for (const itemId of owner.declItems.get(found.decl) ?? []) {
      analysis.builder.edge('consumes', query, { nodeId: owner.nodeId, itemId });
    }
  });
}

function mutationNames(decl: ts.VariableDeclaration): string[] {
  if (ts.isIdentifier(decl.name)) return [decl.name.text];
  if (!ts.isObjectBindingPattern(decl.name)) return [];
  return decl.name.elements.flatMap((element) =>
    ts.isIdentifier(element.name) ? [element.name.text] : [],
  );
}

function invalidatedKeys(call: ts.CallExpression): string[] {
  const keys: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && calleeName(node) === 'invalidateQueries') {
      const key = firstKey(node.arguments[0]);
      if (key !== undefined) keys.push(key);
    }
    ts.forEachChild(node, visit);
  };
  visit(call);
  return keys;
}

function connectMutations(analysis: Analysis): void {
  forEachNode(analysis, (node, owner) => {
    const found = declaredCall(node, MUTATION_HOOKS);
    if (!found) return;
    const names = mutationNames(found.decl);
    const label = names[0] ?? `mutation@${node.getStart().toString()}`;
    const nodeId = analysis.builder.node('query-cache', label);
    const itemId = analysis.builder.item(nodeId, 'mutation', label);
    if (!itemId) return;
    names.forEach((name) => {
      owner.mutations.set(name, itemId);
    });
    for (const key of invalidatedKeys(found.call)) {
      const query = queryFor(analysis, key, 'cache-key');
      if (query) analysis.builder.edge('invalidates', { nodeId, itemId }, query);
    }
  });
}

function fileLabel(fileName: string): string {
  return (fileName.split('/').pop() ?? fileName).replace(/\.[^.]+$/, '');
}

function methodItem(
  analysis: Analysis,
  service: { nodeId: string; methods: Map<string, string> },
  name: string,
): string | undefined {
  const known = service.methods.get(name);
  if (known) return known;
  const itemId = analysis.builder.item(service.nodeId, 'method', name);
  if (itemId) service.methods.set(name, itemId);
  return itemId;
}

// Declaration, name and owner are the three conceptual inputs; analysis is also needed.
// eslint-disable-next-line max-params
function serviceMethod(
  analysis: Analysis,
  declaration: ts.Declaration,
  name: string,
  ownerNode: DiscoveredNode,
): Site | undefined {
  const file = declaration.getSourceFile();
  if (file.isDeclarationFile || analysis.byDecl.has(declaration)) return undefined;
  if (enclosingNode(analysis, declaration)) return undefined;
  if (file.fileName === ownerNode.decl.getSourceFile().fileName) return undefined;
  let service = analysis.services.get(file.fileName);
  if (!service) {
    const nodeId = analysis.builder.node('service', fileLabel(file.fileName));
    service = { nodeId, methods: new Map() };
    analysis.services.set(file.fileName, service);
  }
  const itemId = methodItem(analysis, service, name);
  return itemId ? { nodeId: service.nodeId, itemId } : undefined;
}

function itemRunning(owner: DiscoveredNode, node: ts.Node): string | undefined {
  for (
    let current = node;
    current !== owner.fn && !ts.isSourceFile(current);
    current = current.parent
  ) {
    for (const [itemId, body] of owner.bodies) {
      if (body === current && ['handler', 'effect'].includes(owner.kinds.get(itemId) ?? '')) {
        return itemId;
      }
    }
  }
  return undefined;
}

function calleeTarget(call: ts.CallExpression): ts.Node {
  return ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression;
}

/** The mutation item a call like `m.mutate()` or `save()` triggers, if any. */
function calledMutation(
  owner: DiscoveredNode,
  call: ts.CallExpression,
  name: string,
): string | undefined {
  const receiver = ts.isPropertyAccessExpression(call.expression)
    ? call.expression.expression
    : call.expression;
  const local = ts.isIdentifier(receiver) ? receiver.text : '';
  return owner.mutations.get(local) ?? owner.mutations.get(name);
}

function callMutation(analysis: Analysis, from: Site, mutation: string): void {
  const target = analysis.builder
    .result()
    .nodes.find((candidate) => candidate.items.some((item) => item.id === mutation));
  if (target) analysis.builder.edge('calls', from, { nodeId: target.id, itemId: mutation });
}

// Analysis, call site, call, name and owner are the five inputs; bundling them would only rename them.
// eslint-disable-next-line max-params
function callService(
  analysis: Analysis,
  from: Site,
  call: ts.CallExpression,
  name: string,
  owner: DiscoveredNode,
): void {
  if (/^(?:set|use)[A-Z]/.test(name)) return;
  const declaration = resolveDeclaration(analysis, calleeTarget(call));
  const method = declaration && serviceMethod(analysis, declaration, name, owner);
  if (method) analysis.builder.edge('calls', from, method);
}

function connectCalls(analysis: Analysis): void {
  forEachNode(analysis, (node, owner) => {
    if (!ts.isCallExpression(node)) return;
    const itemId = itemRunning(owner, node);
    const name = calleeName(node);
    if (!itemId || !name) return;
    const from = { nodeId: owner.nodeId, itemId };
    const mutation = calledMutation(owner, node, name);
    if (mutation) callMutation(analysis, from, mutation);
    else callService(analysis, from, node, name, owner);
  });
}

export function detectServices(analysis: Analysis): void {
  connectQueries(analysis);
  connectMutations(analysis);
  connectCalls(analysis);
}
