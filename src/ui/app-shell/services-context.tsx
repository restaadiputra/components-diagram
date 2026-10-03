import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { DiagramLibrary } from '../../application/diagram-library';
import type { DiagramSession } from '../../application/diagram-session';
import type { DiagramState, DiagramStore } from '../../application/diagram-store';

/** Everything the UI needs from outside, chosen by the composition root. */
export interface Services {
  store: DiagramStore;
  session: DiagramSession;
  library: DiagramLibrary;
  newId: () => string;
  /** False when the browser has no usable storage and diagrams live in memory only. */
  persistent: boolean;
}

const ServicesContext = createContext<Services | null>(null);

export const ServicesProvider = ServicesContext.Provider;

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesProvider is missing');
  return services;
}

export function useDiagramState<T>(selector: (state: DiagramState) => T): T {
  return useStore(useServices().store, selector);
}
