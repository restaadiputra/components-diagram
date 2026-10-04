import * as ts from 'typescript';
import type { ItemKind } from '../../domain/diagram';
import type { Analysis, DiscoveredNode } from './analysis';
import { calleeName } from './discover-nodes';

interface Kit {
  analysis: Analysis;
  node: DiscoveredNode;
}

// Name, kind, body and type all describe one item; an options object would only restate them.
// eslint-disable-next-line max-params
function addItem(
  kit: Kit,
  kind: ItemKind,
  name: string,
  body?: ts.Node,
  type?: string,
): string | undefined {
  const id = kit.analysis.builder.item(kit.node.nodeId, kind, name, type);
  if (id === undefined) return undefined;
  kit.node.kinds.set(id, kind);
  // A returned name must not hide the local it re-exports (later stages trace through scope).
  if (kind !== 'return' || !kit.node.scope.has(name)) kit.node.scope.set(name, id);
  if (body) kit.node.bodies.set(id, body);
  return id;
}

/** Records the item a declaration created; a rejected item leaves no entry. */
function setDeclItem(kit: Kit, decl: ts.VariableDeclaration, id: string | undefined): void {
  if (id !== undefined) kit.node.declItems.set(decl, [id]);
}

function boundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : boundNames(element.name),
  );
}

function propertyKey(element: ts.BindingElement): string {
  const key = element.propertyName ?? element.name;
  return ts.isIdentifier(key) ? key.text : key.getText();
}

function extractProps(kit: Kit, param: ts.ParameterDeclaration): void {
  if (ts.isObjectBindingPattern(param.name)) {
    for (const element of param.name.elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const id = addItem(kit, 'prop', element.name.text);
      if (id) kit.node.props.set(propertyKey(element), id);
    }
    return;
  }
  const type = kit.analysis.checker.getTypeAtLocation(param);
  for (const property of type.getProperties()) {
    const id = addItem(kit, 'prop', property.name);
    if (id) kit.node.props.set(property.name, id);
  }
}

function extractParameters(kit: Kit, fn: ts.FunctionLikeDeclaration): void {
  for (const param of fn.parameters) {
    for (const name of boundNames(param.name)) {
      const id = addItem(kit, 'parameter', name);
      if (id) kit.node.params.push(id);
    }
  }
}

function mentionsScope(kit: Kit, root: ts.Node): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(node) && kit.node.scope.has(node.text)) found = true;
    else ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

function bindDerived(kit: Kit, decl: ts.VariableDeclaration): void {
  const ids = boundNames(decl.name).flatMap((name) => {
    const id = addItem(kit, 'derived', name, decl);
    return id ? [id] : [];
  });
  kit.node.declItems.set(decl, ids);
}

function extractState(kit: Kit, decl: ts.VariableDeclaration): void {
  if (!ts.isArrayBindingPattern(decl.name)) return;
  const [value, setter] = decl.name.elements;
  if (!value || ts.isOmittedExpression(value) || !ts.isIdentifier(value.name)) return;
  const id = addItem(kit, 'state', value.name.text, decl);
  if (!id) return;
  kit.node.declItems.set(decl, [id]);
  if (setter && !ts.isOmittedExpression(setter) && ts.isIdentifier(setter.name)) {
    kit.node.setters.set(setter.name.text, id);
  }
}

/** The item kind for a single-name declaration, chosen by what initializes it. */
function singleKind(callee: string, init: ts.Expression): ItemKind | undefined {
  if (callee === 'useRef') return 'ref';
  if (callee === 'useMemo') return 'derived';
  const isFunction = ts.isArrowFunction(init) || ts.isFunctionExpression(init);
  return callee === 'useCallback' || isFunction ? 'handler' : undefined;
}

function extractOther(kit: Kit, decl: ts.VariableDeclaration, init: ts.Expression): void {
  const callee = ts.isCallExpression(init) ? (calleeName(init) ?? '') : '';
  const kind = ts.isIdentifier(decl.name) ? singleKind(callee, init) : undefined;
  if (kind && ts.isIdentifier(decl.name)) {
    setDeclItem(kit, decl, addItem(kit, kind, decl.name.text, decl));
  } else if (callee.startsWith('use') || mentionsScope(kit, init)) {
    bindDerived(kit, decl);
  }
}

function extractDeclaration(kit: Kit, decl: ts.VariableDeclaration): void {
  const init = decl.initializer;
  if (!init) return;
  const callee = ts.isCallExpression(init) ? calleeName(init) : undefined;
  if (callee === 'useState' || callee === 'useReducer') extractState(kit, decl);
  else extractOther(kit, decl, init);
}

function returnNames(value: ts.Expression | undefined): string[] {
  if (!value) return [];
  if (ts.isObjectLiteralExpression(value)) {
    return value.properties.flatMap((property) =>
      property.name && ts.isIdentifier(property.name) ? [property.name.text] : [],
    );
  }
  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.flatMap((element) => (ts.isIdentifier(element) ? [element.text] : []));
  }
  return [ts.isIdentifier(value) ? value.text : 'value'];
}

function extractReturn(kit: Kit, statement: ts.ReturnStatement): void {
  for (const name of returnNames(statement.expression)) {
    const id = addItem(kit, 'return', name, statement);
    if (id) kit.node.returns.push({ name, itemId: id });
  }
}

function extractEffect(kit: Kit, statement: ts.ExpressionStatement, call: ts.CallExpression): void {
  const callee = calleeName(call);
  if (callee !== 'useEffect' && callee !== 'useLayoutEffect') return;
  const { line } = statement.getSourceFile().getLineAndCharacterOfPosition(statement.getStart());
  addItem(kit, 'effect', `effect@${(line + 1).toString()}`, call);
}

function extractStatement(kit: Kit, statement: ts.Statement): void {
  if (ts.isVariableStatement(statement)) {
    statement.declarationList.declarations.forEach((decl) => {
      extractDeclaration(kit, decl);
    });
  } else if (ts.isFunctionDeclaration(statement) && statement.name) {
    addItem(kit, 'handler', statement.name.text, statement);
  } else if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
    extractEffect(kit, statement, statement.expression);
  } else if (ts.isReturnStatement(statement) && kit.node.kind === 'hook') {
    extractReturn(kit, statement);
  }
}

function extractFunction(kit: Kit, fn: ts.FunctionLikeDeclaration): void {
  const [first] = fn.parameters;
  if (kit.node.kind === 'component' && first) extractProps(kit, first);
  if (kit.node.kind === 'hook') extractParameters(kit, fn);
  if (fn.body && ts.isBlock(fn.body)) {
    fn.body.statements.forEach((statement) => {
      extractStatement(kit, statement);
    });
  }
}

export function extractItems(analysis: Analysis): void {
  for (const node of analysis.byDecl.values()) {
    const kit = { analysis, node };
    if (node.kind === 'context') addItem(kit, 'value', 'value');
    else if (node.fn) extractFunction(kit, node.fn);
  }
}
