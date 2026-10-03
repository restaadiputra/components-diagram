import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Where Tab goes next so focus stays inside; null lets the browser move it normally. */
function wrapTarget(container: HTMLElement, shift: boolean): HTMLElement | null {
  const items = focusableIn(container);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return container;
  const active = document.activeElement;
  if (!container.contains(active)) return first;
  if (shift && active === first) return last;
  if (!shift && active === last) return first;
  return null;
}

/**
 * Modal behaviour for a dialog: focus moves in on open and back to the opener on
 * close, Tab cycles inside, and Escape calls `onClose`. The listener sits on the
 * document so it still works when a click left focus on the page body. A field that
 * handles Escape itself (CommitInput) stops the event so it never reaches here.
 */
export function useModalFocus(container: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const opener = document.activeElement;
    const node = container.current;
    if (node) (focusableIn(node)[0] ?? node).focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [container]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const node = container.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        // Closing re-enables the window-level shortcuts before this same event reaches
        // them; without this, Escape would also clear the selection behind the dialog.
        event.stopPropagation();
        onClose();
      } else if (event.key === 'Tab' && node) {
        const target = wrapTarget(node, event.shiftKey);
        if (!target) return;
        event.preventDefault();
        target.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [container, onClose]);
}
