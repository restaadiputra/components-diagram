import { useRef, useState } from 'react';

interface EditableNameProps {
  value: string;
  onRename: (name: string) => void;
}

/** Shows a name; double-click turns it into a field. */
export function EditableName({ value, onRename }: EditableNameProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // Enter, Escape and blur all end an edit, and closing the field can itself fire blur.
  // Only the first of them may act.
  const settled = useRef(false);

  if (draft === null) {
    return (
      <span
        className="font-semibold"
        onDoubleClick={(event) => {
          event.stopPropagation();
          settled.current = false;
          setDraft(value);
        }}
      >
        {value}
      </span>
    );
  }

  const finish = (save: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const name = draft.trim();
    if (save && name !== '' && name !== value) onRename(name);
    setDraft(null);
  };

  return (
    <input
      aria-label="Name"
      autoFocus
      // `nodrag` stops React Flow from dragging the node while text is selected.
      className="nodrag w-28 rounded border bg-white px-1 text-slate-900"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(true);
        if (event.key === 'Escape') finish(false);
      }}
    />
  );
}
