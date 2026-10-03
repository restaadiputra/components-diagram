import { useEffect } from 'react';
import { removeSelection } from '../../application/commands/remove-selection';
import type { DiagramState } from '../../application/diagram-store';
import { useServices } from './services-context';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function handleKey(event: KeyboardEvent, state: DiagramState): void {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault();
    if (event.shiftKey) state.redo();
    else state.undo();
  } else if (key === 'delete' || key === 'backspace') {
    state.apply((diagram) => removeSelection(diagram, state.selection));
  } else if (key === 'escape') {
    state.select(null);
  }
}

export function useShortcuts(): void {
  const { store } = useServices();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Keys typed into a field belong to that field.
      if (!isTyping(event.target)) handleKey(event, store.getState());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [store]);
}
