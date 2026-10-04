import type { Diagram } from '../diagram';
import { overloadedComponent } from './overloaded-component';
import { propDrilling } from './prop-drilling';
import { singleConsumerContext } from './single-consumer-context';
import {
  WARNING_THRESHOLDS,
  type DiagramWarning,
  type WarningRule,
  type WarningThresholds,
} from './types';

export const WARNING_RULES: readonly WarningRule[] = [
  overloadedComponent,
  singleConsumerContext,
  propDrilling,
];

export function findWarnings(
  diagram: Diagram,
  thresholds: WarningThresholds = WARNING_THRESHOLDS,
): DiagramWarning[] {
  return WARNING_RULES.flatMap((rule) => rule(diagram, thresholds));
}
