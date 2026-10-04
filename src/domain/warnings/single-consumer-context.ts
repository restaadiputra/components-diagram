import { findNode } from '../diagram';
import type { DiagramWarning, WarningRule } from './types';

export const singleConsumerContext: WarningRule = (diagram) =>
  diagram.nodes.flatMap((context): DiagramWarning[] => {
    if (context.kind !== 'context') return [];
    const consumers = new Set(
      diagram.edges
        .filter((edge) => edge.kind === 'consumes' && edge.source.nodeId === context.id)
        .map((edge) => edge.target.nodeId),
    );
    const [only] = [...consumers];
    // Zero consumers means the context is unfinished, not smelly.
    if (consumers.size !== 1 || only === undefined) return [];
    const name = findNode(diagram, only)?.name ?? only;
    return [
      {
        ruleId: 'single-consumer-context',
        target: { nodeId: context.id },
        message: `Only ${name} consumes this context`,
        relatedNodeIds: [only],
      },
    ];
  });
