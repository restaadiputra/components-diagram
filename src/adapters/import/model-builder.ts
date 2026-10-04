import { addItem } from '../../application/commands/add-item';
import { addNode } from '../../application/commands/add-node';
import { connect } from '../../application/commands/connect';
import { linkItems } from '../../application/commands/link-items';
import {
  createDiagram,
  type DiagramEdge,
  type DiagramNode,
  type EdgeKind,
  type Endpoint,
  type ItemKind,
  type LinkRelation,
  type NodeKind,
} from '../../domain/diagram';

export interface Builder {
  node(kind: NodeKind, name: string): string;
  item(nodeId: string, kind: ItemKind, name: string, type?: string): string | undefined;
  link(nodeId: string, fromItemId: string, toItemId: string, relation: LinkRelation): void;
  edge(kind: EdgeKind, source: Endpoint, target: Endpoint): boolean;
  result(): { nodes: DiagramNode[]; edges: DiagramEdge[] };
}

/** Works on a scratch diagram so every change is validated by the same commands the editor uses. */
export function createBuilder(newId: () => string): Builder {
  let diagram = createDiagram('import', 'import', '');
  return {
    node(kind, name) {
      const id = newId();
      diagram = addNode(diagram, { id, kind, name, position: { x: 0, y: 0 } });
      return id;
    },
    // eslint-disable-next-line max-params -- signature is fixed by the Builder interface
    item(nodeId, kind, name, type) {
      const id = newId();
      const next = addItem(diagram, {
        nodeId,
        item: type === undefined ? { id, kind, name } : { id, kind, name, type },
      });
      const accepted = next !== diagram;
      diagram = next;
      return accepted ? id : undefined;
    },
    // eslint-disable-next-line max-params -- signature is fixed by the Builder interface
    link(nodeId, fromItemId, toItemId, relation) {
      diagram = linkItems(diagram, {
        nodeId,
        link: { id: newId(), fromItemId, toItemId, relation },
      });
    },
    edge(kind, source, target) {
      const next = connect(diagram, { id: newId(), kind, source, target });
      const accepted = next !== diagram;
      diagram = next;
      return accepted;
    },
    result: () => ({ nodes: diagram.nodes, edges: diagram.edges }),
  };
}
