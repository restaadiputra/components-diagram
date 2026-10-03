export type Selection =
  | { type: 'node'; nodeId: string }
  | { type: 'item'; nodeId: string; itemId: string }
  | { type: 'edge'; edgeId: string }
  | null;
