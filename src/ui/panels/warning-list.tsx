import { findNode } from '../../domain/diagram';
import { WARNING_RULE_LABELS, type DiagramWarning } from '../../domain/warnings/types';
import { useDiagramState } from '../app-shell/services-context';

interface ViewProps {
  warnings: DiagramWarning[];
  nameOf: (nodeId: string) => string;
}

export function WarningListView({ warnings, nameOf }: ViewProps) {
  if (warnings.length === 0) return null;
  return (
    <section aria-label="Warnings" className="mt-3 border-t pt-2">
      <h4 className="mb-1 font-semibold text-amber-700">Warnings</h4>
      <ul className="space-y-2">
        {warnings.map((warning, index) => (
          <li key={`${warning.ruleId}:${index.toString()}`}>
            <div className="font-medium">{WARNING_RULE_LABELS[warning.ruleId]}</div>
            <p>{warning.message}</p>
            {warning.relatedNodeIds.length > 1 && (
              <p className="text-slate-500">{warning.relatedNodeIds.map(nameOf).join(' → ')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WarningList({ warnings }: { warnings: DiagramWarning[] }) {
  const diagram = useDiagramState((state) => state.diagram);
  const nameOf = (nodeId: string) => findNode(diagram, nodeId)?.name ?? nodeId;
  return <WarningListView warnings={warnings} nameOf={nameOf} />;
}
