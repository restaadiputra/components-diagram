import type { Diagram } from '../diagram';

export const WARNING_RULE_IDS = [
  'prop-drilling',
  'single-consumer-context',
  'overloaded-component',
] as const;
export type WarningRuleId = (typeof WARNING_RULE_IDS)[number];

export const WARNING_RULE_LABELS: Record<WarningRuleId, string> = {
  'prop-drilling': 'Prop drilling',
  'single-consumer-context': 'Single-consumer context',
  'overloaded-component': 'Overloaded component',
};

export interface DiagramWarning {
  ruleId: WarningRuleId;
  /** Without `itemId` the warning is about the node as a whole. */
  target: { nodeId: string; itemId?: string };
  message: string;
  /** Nodes involved, origin first, so the inspector can show a chain. */
  relatedNodeIds: string[];
}

export interface WarningThresholds {
  /** Forwarding edges a value must cross before it counts as drilling. */
  drillingHops: number;
  /** A component is flagged when it holds more items than this. */
  maxItems: number;
  /** A component is flagged when it holds more props than this. */
  maxProps: number;
}

export const WARNING_THRESHOLDS: Readonly<WarningThresholds> = {
  drillingHops: 3,
  maxItems: 12,
  maxProps: 6,
};

/** Rules are pure; adding one means adding a file and a registry entry. */
export type WarningRule = (diagram: Diagram, thresholds: WarningThresholds) => DiagramWarning[];
