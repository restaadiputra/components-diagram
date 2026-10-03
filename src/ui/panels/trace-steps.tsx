import { describeStep } from '../../domain/trace-description';
import { useDiagramState } from '../app-shell/services-context';

export function TraceSteps() {
  const diagram = useDiagramState((state) => state.diagram);
  const traceResult = useDiagramState((state) => state.traceResult);
  if (traceResult === null) return null;

  return (
    <section className="mb-3">
      <h4 className="mb-1 text-xs uppercase text-slate-400">Data flow</h4>
      {traceResult.steps.length === 0 ? (
        <p className="text-slate-400">Not connected to anything yet.</p>
      ) : (
        <ol aria-label="Trace" className="list-decimal pl-5">
          {traceResult.steps.map((step) => (
            <li key={step.via.id}>{describeStep(diagram, step)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
