import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  /** Called for Escape; the parent decides whether to close. */
  onClose: () => void;
  /** `sheet` slides up from the bottom (calendar); `centre` sits in the middle (confirmations). */
  placement: 'sheet' | 'centre';
  /** `alertdialog` for confirmations that interrupt. */
  role?: 'dialog' | 'alertdialog';
  /** Id of the visible title. */
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
}

/**
 * A modal on the native <dialog>: showModal() gives the focus trap, the inert page behind
 * and the backdrop. Focus starts on the element marked `data-autofocus` (else the first
 * focusable one) and goes back to whatever had it when the dialog closes.
 */
export function Dialog({
  open,
  onClose,
  placement,
  role = 'dialog',
  labelledBy,
  describedBy,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  // Escape is handled here, not left to the browser's own close, so React state stays the
  // one source of truth for whether the dialog is open.
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const position =
    placement === 'sheet'
      ? 'mx-auto mt-auto mb-[22px] w-[calc(100%-30px)] max-w-[420px]'
      : 'm-auto w-[calc(100%-48px)] max-w-[360px]';

  return (
    <dialog
      ref={ref}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-modal="true"
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`${placement} max-h-[calc(100dvh-30px)] overflow-visible bg-transparent p-0 text-ink ${position}`}
    >
      {open ? children : null}
    </dialog>
  );
}
