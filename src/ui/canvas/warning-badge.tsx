import type { DiagramWarning } from '../../domain/warnings/types';

/** Not a button: clicks fall through to the node or row so selection still works. */
export function WarningBadge({ warnings }: { warnings: DiagramWarning[] }) {
  const [first] = warnings;
  if (!first) return null;
  const label =
    warnings.length === 1
      ? first.message
      : `${first.message} (+${(warnings.length - 1).toString()} more)`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="rounded bg-white px-1 leading-4 text-amber-600"
    >
      ⚠
    </span>
  );
}
