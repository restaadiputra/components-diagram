export interface FileGateway {
  saveText: (fileName: string, text: string) => void;
  /** Resolves to undefined when the user cancels. */
  openText: () => Promise<string | undefined>;
}
