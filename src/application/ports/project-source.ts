export interface PickedProject {
  /** The folder's name. */
  name: string;
  /** Relative path (`/`-separated) → source text. */
  files: Record<string, string>;
  skipped: { tooLarge: number; tooMany: boolean };
}

export interface PickOptions {
  maxFiles?: number;
  onProgress?: (filesRead: number) => void;
  signal?: AbortSignal;
}

export interface ProjectSource {
  supported: boolean;
  /** Resolves to undefined when the user cancels; rejects with a readable Error otherwise. */
  pick: (options?: PickOptions) => Promise<PickedProject | undefined>;
}
