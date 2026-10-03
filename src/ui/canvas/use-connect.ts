import type { Connection, Edge } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { endpointsOf } from '../../adapters/canvas/from-flow';
import { connect } from '../../application/commands/connect';
import { validEdgeKinds } from '../../domain/connection-rules';
import type { EdgeKind, Endpoint } from '../../domain/diagram';
import { useServices } from '../app-shell/services-context';
import { useEscape } from './use-escape';

interface Ends {
  source: Endpoint;
  target: Endpoint;
}

/** A connection that several edge kinds would fit, waiting for the user to choose. */
export interface PendingConnection extends Ends {
  kinds: EdgeKind[];
}

export function useConnect() {
  const { store, newId } = useServices();
  const [pending, setPending] = useState<PendingConnection | null>(null);

  const kindsFor = (ends: Ends) =>
    validEdgeKinds(store.getState().diagram, ends.source, ends.target);
  const create = (kind: EdgeKind, ends: Ends) => {
    store.getState().apply((diagram) => connect(diagram, { id: newId(), kind, ...ends }));
  };

  const onConnect = (connection: Connection) => {
    const ends = endpointsOf(connection);
    const kinds = kindsFor(ends);
    const [only] = kinds;
    if (only === undefined) return;
    if (kinds.length === 1) create(only, ends);
    else setPending({ ...ends, kinds });
  };

  const isValidConnection = (connection: Connection | Edge) =>
    kindsFor(endpointsOf(connection)).length > 0;

  const cancel = useCallback(() => setPending(null), []);

  // The diagram may have changed (undo, delete) while the menu was open.
  const choose = (kind: EdgeKind) => {
    if (pending && kindsFor(pending).includes(kind)) create(kind, pending);
    setPending(null);
  };

  useEscape(pending !== null, cancel);

  return { pending, onConnect, isValidConnection, choose, cancel };
}
