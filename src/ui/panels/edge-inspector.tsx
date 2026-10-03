import { removeEdge } from '../../application/commands/remove-edge';
import type { DiagramEdge } from '../../domain/diagram';
import { EDGE_KINDS } from '../../domain/edge-kinds';
import { endpointLabel } from '../../domain/labels';
import { useDiagramState, useServices } from '../app-shell/services-context';

export function EdgeInspector({ edge }: { edge: DiagramEdge }) {
  const { store } = useServices();
  const diagram = useDiagramState((state) => state.diagram);
  return (
    <>
      <h3 className="mb-2 font-semibold">{EDGE_KINDS[edge.kind].label}</h3>
      <p className="mb-3">
        {endpointLabel(diagram, edge.source)} → {endpointLabel(diagram, edge.target)}
      </p>
      <button
        className="rounded border border-red-300 px-2 py-0.5 text-red-700"
        onClick={() => store.getState().apply((current) => removeEdge(current, edge.id))}
      >
        Delete edge
      </button>
    </>
  );
}
