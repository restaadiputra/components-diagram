import { Handle, Position } from '@xyflow/react';
import { handleId } from '../../adapters/canvas/handle-ids';
import { renameNode } from '../../application/commands/rename-node';
import { toggleCollapsed } from '../../application/commands/toggle-collapsed';
import { nodeWarnings } from '../../application/diagram-warnings';
import type { DiagramNode } from '../../domain/diagram';
import { NODE_KINDS } from '../../domain/node-kinds';
import { useServices } from '../app-shell/services-context';
import { useWarnings } from '../app-shell/use-warnings';
import { EditableName } from './editable-name';
import { useInvalidTarget } from './use-invalid-target';
import { WarningBadge } from './warning-badge';

export function NodeHeader({ node }: { node: DiagramNode }) {
  const { store } = useServices();
  const spec = NODE_KINDS[node.kind];
  const invalid = useInvalidTarget({ nodeId: node.id });
  const apply = store.getState().apply;
  const warnings = nodeWarnings(useWarnings(), node);

  return (
    <div
      className={`relative flex items-center gap-2 rounded-t px-3 py-1.5 text-white ${invalid ? 'opacity-40' : ''}`}
      style={{ backgroundColor: spec.color }}
      title={spec.label}
    >
      <Handle type="target" position={Position.Left} id={handleId('in')} />
      <span aria-hidden>{spec.icon}</span>
      <EditableName
        value={node.name}
        onRename={(name) => apply((diagram) => renameNode(diagram, { nodeId: node.id, name }))}
      />
      <WarningBadge warnings={warnings} />
      <button
        aria-label={node.collapsed ? 'Expand' : 'Collapse'}
        className="nodrag ml-auto"
        onClick={(event) => {
          event.stopPropagation();
          apply((diagram) => toggleCollapsed(diagram, node.id));
        }}
      >
        {node.collapsed ? '▸' : '▾'}
      </button>
      <Handle type="source" position={Position.Right} id={handleId('out')} />
    </div>
  );
}
