import { useId } from 'react';
import { Dialog } from '../ui/Dialog.tsx';
import { Keycap } from '../ui/Keycap.tsx';
import { TallText } from '../ui/TallText.tsx';

interface DiscardDialogProps {
  open: boolean;
  /** What would be lost, as it would print. */
  preview: { description: string; amount: string };
  onKeep: () => void;
  onDiscard: () => void;
}

/** "Discard this line?" Asked only when cancelling would throw something away. */
export function DiscardDialog({ open, preview, onKeep, onDiscard }: DiscardDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Dialog
      open={open}
      onClose={onKeep}
      placement="centre"
      role="alertdialog"
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="paper-panel flex flex-col gap-3 p-4">
        <h2 id={titleId}>
          <TallText sx={2} sy={3} align="start">
            DISCARD THIS LINE?
          </TallText>
        </h2>
        <p id={bodyId} className="text-line text-muted">
          It hasn&apos;t been printed yet. Discarding throws it away.
        </p>
        <p className="flex gap-2 border-y-2 border-dashed border-paper-side py-1.5 text-line text-muted">
          <s className="min-w-0 truncate">{preview.description}</s>
          <span className="flex-1" />
          <s>{preview.amount}</s>
        </p>
        <div className="flex gap-3 px-[3px] pt-[3px] pb-[9px]">
          <Keycap
            variant="paper"
            data-autofocus
            onClick={onKeep}
            className="h-12 flex-1 font-pixel text-pixel-8"
          >
            KEEP EDITING
          </Keycap>
          <Keycap
            variant="danger"
            onClick={onDiscard}
            className="h-12 flex-1 font-pixel text-pixel-8"
          >
            DISCARD
          </Keycap>
        </div>
      </div>
    </Dialog>
  );
}
