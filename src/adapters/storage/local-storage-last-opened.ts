import type { LastOpenedStore } from '../../application/ports/last-opened-store';

const KEY = 'components-diagram:last-opened';

/** localStorage throws in some private modes; forgetting the last diagram is harmless. */
export const localStorageLastOpened: LastOpenedStore = {
  get: () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (id) => {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // Nothing to do: the app simply opens the most recent diagram next time.
    }
  },
};
