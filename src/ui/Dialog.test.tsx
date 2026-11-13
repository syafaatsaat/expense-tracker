import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog } from './Dialog.tsx';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        placement="centre"
        role="alertdialog"
        labelledBy="t"
      >
        <h2 id="t">Discard this line?</h2>
        <button type="button">Keep editing</button>
        <button type="button" data-autofocus>
          Discard
        </button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('opens labelled, with focus on the marked control', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('alertdialog', { name: 'Discard this line?' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus();
  });

  it('asks the parent to close on Escape and gives focus back to the opener', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('renders nothing inside while closed', () => {
    render(<Harness />);
    expect(screen.queryByText('Discard this line?')).not.toBeInTheDocument();
  });
});
