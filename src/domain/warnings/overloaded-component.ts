import type { DiagramNode } from '../diagram';
import type { DiagramWarning, WarningRule, WarningThresholds } from './types';

function exceeded(node: DiagramNode, thresholds: WarningThresholds): string[] {
  const reasons: string[] = [];
  if (node.items.length > thresholds.maxItems) {
    reasons.push(`${node.items.length.toString()} items (limit ${thresholds.maxItems.toString()})`);
  }
  const props = node.items.filter((item) => item.kind === 'prop').length;
  if (props > thresholds.maxProps) {
    reasons.push(`${props.toString()} props (limit ${thresholds.maxProps.toString()})`);
  }
  return reasons;
}

export const overloadedComponent: WarningRule = (diagram, thresholds) =>
  diagram.nodes.flatMap((node): DiagramWarning[] => {
    if (node.kind !== 'component') return [];
    const reasons = exceeded(node, thresholds);
    if (reasons.length === 0) return [];
    return [
      {
        ruleId: 'overloaded-component',
        target: { nodeId: node.id },
        message: `${node.name} has ${reasons.join(' and ')}`,
        relatedNodeIds: [],
      },
    ];
  });
