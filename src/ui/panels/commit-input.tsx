import { useState } from 'react';

interface CommitInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}

/**
 * A text field that commits on blur or Enter, so one edit is one undo step.
 * Give it a `key` that includes `value` so an undo resets the draft.
 */
export function CommitInput({ label, value, onCommit }: CommitInputProps) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="mb-2 block text-xs text-slate-500">
      {label}
      <input
        className="mt-0.5 w-full rounded border bg-white px-2 py-1 text-sm text-slate-900"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft === value) return;
          onCommit(draft);
          // Show what the store holds: a rejected or trimmed commit leaves `value`
          // unchanged and the key stable, so nothing else would reset the draft.
          // An accepted commit changes the key and remounts, which supersedes this.
          setDraft(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </label>
  );
}
