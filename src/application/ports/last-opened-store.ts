export interface LastOpenedStore {
  get: () => string | null;
  set: (id: string) => void;
}
