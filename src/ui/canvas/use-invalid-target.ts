import { useConnection } from '@xyflow/react';
import { isInvalidTarget } from '../../adapters/canvas/from-flow';
import { toEndpoint } from '../../adapters/canvas/handle-ids';
import { sameEndpoint, type Endpoint } from '../../domain/diagram';
import { useDiagramState } from '../app-shell/services-context';

/** True while a connection is being dragged that this endpoint cannot accept. */
export function useInvalidTarget(endpoint: Endpoint): boolean {
  const connection = useConnection();
  const diagram = useDiagramState((state) => state.diagram);
  if (!connection.inProgress) return false;
  const origin = toEndpoint(connection.fromNode.id, connection.fromHandle.id);
  if (sameEndpoint(origin, endpoint)) return false;
  return isInvalidTarget(diagram, { endpoint: origin, side: connection.fromHandle.type }, endpoint);
}
