import { removeNode } from '../../application/commands/remove-node';
import { renameNode } from '../../application/commands/rename-node';
import type { DiagramNode } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';
import { useServices } from '../app-shell/services-context';
import { CommitInput } from './commit-input';

export function NodeInspector({ node }: { node: DiagramNode }) {
  const { store } = useServices();
  const apply = store.getState().apply;
  return (
    <>
      <h3 className="mb-2 font-semibold">{NODE_KINDS[node.kind].label}</h3>
      <CommitInput
        key={`${node.id}:${node.name}`}
        label="Name"
        value={node.name}
        onCommit={(name) => apply((diagram) => renameNode(diagram, { nodeId: node.id, name }))}
      />
      <button
        className="rounded border border-red-300 px-2 py-0.5 text-red-700"
        onClick={() => apply((diagram) => removeNode(diagram, node.id))}
      >
        Delete node
      </button>
    </>
  );
}
