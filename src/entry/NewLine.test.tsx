import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense, LocalDate } from '../domain/types.ts';
import type { WriteResult } from '../storage/repository.ts';
import { makeExpense } from '../test/factories.ts';
import { NewLine } from './NewLine.tsx';

const TODAY: LocalDate = '2026-11-13'; // a Friday

interface Options {
  layout?: 'screen' | 'column';
  initialDate?: LocalDate;
  result?: WriteResult<Expense>;
}

function renderNewLine({
  layout = 'screen',
  initialDate = TODAY,
  result = { ok: true, value: makeExpense() },
}: Options = {}) {
  const onPrint = vi.fn(() => Promise.resolve(result));
  const onCancel = vi.fn();
  render(
    <NewLine
      today={TODAY}
      initialDate={initialDate}
      layout={layout}
      onPrint={onPrint}
      onCancel={layout === 'screen' ? onCancel : undefined}
    />,
  );
  return { user: userEvent.setup(), onPrint, onCancel };
}

const amount = () => screen.getByRole('status', { name: 'Amount' });
const keypad = () => within(screen.getByRole('group', { name: 'Amount keypad' }));
const departments = () => within(screen.getByRole('group', { name: 'Department' }));
const description = () => screen.getByRole('textbox', { name: /new line/i });

async function press(user: ReturnType<typeof userEvent.setup>, ...keys: string[]) {
  for (const key of keys) await user.click(keypad().getByRole('button', { name: key }));
}

describe('NewLine', () => {
  it('starts empty, on today, in Food & dining', () => {
    renderNewLine();
    expect(amount()).toHaveTextContent('S$0.00');
    expect(description()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'TODAY' })).toHaveAttribute('aria-pressed', 'true');
    expect(departments().getByRole('button', { name: 'Food & dining' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('FRI 13 NOV')).toBeInTheDocument();
  });

  it('fills the amount from the right on the keypad, like a till', async () => {
    const { user } = renderNewLine();
    await press(user, '5', '8', '0');
    expect(amount()).toHaveTextContent('S$5.80');
    await press(user, 'Delete last digit');
    expect(amount()).toHaveTextContent('S$0.58');
  });

  it('takes digits and Backspace from a keyboard outside the description', async () => {
    const { user } = renderNewLine();
    await user.click(departments().getByRole('button', { name: 'Transportation' }));
    await user.keyboard('1250');
    expect(amount()).toHaveTextContent('S$12.50');
    await user.keyboard('{Backspace}');
    expect(amount()).toHaveTextContent('S$1.25');

    await user.click(description());
    await user.keyboard('7up');
    expect(description()).toHaveValue('7up');
    expect(amount()).toHaveTextContent('S$1.25');
  });

  it('picks one department at a time', async () => {
    const { user } = renderNewLine();
    await user.click(departments().getByRole('button', { name: 'Transportation' }));
    expect(departments().getByRole('button', { name: 'Transportation' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(departments().getByRole('button', { name: 'Food & dining' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('prints a complete line with what was entered', async () => {
    const { user, onPrint } = renderNewLine();
    await user.type(description(), 'chicken rice');
    await press(user, '5', '8', '0');
    await user.click(screen.getByRole('button', { name: 'PRINT LINE - S$5.80' }));
    expect(onPrint).toHaveBeenCalledWith({
      amountCents: 580,
      note: 'chicken rice',
      categoryId: 'food',
      date: TODAY,
    });
  });

  it('prints with Enter from the description', async () => {
    const { user, onPrint } = renderNewLine();
    await press(user, '4', '2', '0');
    await user.type(description(), 'kopi{Enter}');
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it('dates the line yesterday', async () => {
    const { user, onPrint } = renderNewLine();
    await user.click(screen.getByRole('button', { name: 'YESTERDAY' }));
    expect(screen.getByRole('button', { name: 'YESTERDAY' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('THU 12 NOV')).toBeInTheDocument();
    await press(user, '1');
    await user.click(screen.getByRole('button', { name: /print line/i }));
    expect(onPrint).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-11-12' }));
  });

  it('starts on the date it is given, for back-filling a past month', () => {
    renderNewLine({ initialDate: '2026-10-31' });
    expect(screen.getAllByText('SAT 31 OCT').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /pick date/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  describe('date picker', () => {
    it('picks an earlier day and locks future ones', async () => {
      const { user, onPrint } = renderNewLine();
      await user.click(screen.getByRole('button', { name: /pick date/i }));
      const sheet = within(screen.getByRole('dialog', { name: 'Pick a date' }));
      expect(sheet.getByRole('button', { name: /saturday 14 november/i })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(sheet.getByRole('button', { name: /saturday 14 november/i }));
      expect(screen.getByRole('dialog', { name: 'Pick a date' })).toBeInTheDocument();

      await user.click(sheet.getByRole('button', { name: /tuesday 3 november/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pick date/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getAllByText('TUE 03 NOV').length).toBeGreaterThan(0);
      await press(user, '1');
      await user.click(screen.getByRole('button', { name: /print line/i }));
      expect(onPrint).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-11-03' }));
    });

    it('moves between days with the arrow keys and between months with the arrows', async () => {
      const { user } = renderNewLine();
      await user.click(screen.getByRole('button', { name: /pick date/i }));
      const sheet = within(screen.getByRole('dialog', { name: 'Pick a date' }));
      expect(sheet.getByRole('button', { name: /friday 13 november/i })).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(sheet.getByRole('button', { name: /thursday 12 november/i })).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(sheet.getByRole('button', { name: /thursday 5 november/i })).toHaveFocus();
      await user.keyboard('{ArrowRight}{ArrowDown}{ArrowDown}');
      // Down from Fri 6 would be Fri 20, in the future, so it stops at today.
      expect(sheet.getByRole('button', { name: /friday 13 november/i })).toHaveFocus();

      expect(sheet.getByRole('button', { name: 'Next month' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(sheet.getByRole('button', { name: 'Previous month' }));
      expect(sheet.getByText('OCT 2026')).toBeInTheDocument();
      expect(sheet.getByRole('button', { name: /saturday 31 october/i })).toBeInTheDocument();
    });

    it('goes back to today, or cancels without changing the date', async () => {
      const { user } = renderNewLine({ initialDate: '2026-11-02' });
      await user.click(screen.getByRole('button', { name: /pick date/i }));
      const sheet = within(screen.getByRole('dialog', { name: 'Pick a date' }));
      await user.click(sheet.getByRole('button', { name: 'CANCEL' }));
      expect(screen.getAllByText('MON 02 NOV').length).toBeGreaterThan(0);

      await user.click(screen.getByRole('button', { name: /pick date/i }));
      await user.click(screen.getByRole('button', { name: 'BACK TO TODAY' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TODAY' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('validation', () => {
    it('lists every error on PRINT and holds PRINT until they are fixed', async () => {
      const { user, onPrint } = renderNewLine();
      await user.click(screen.getByRole('button', { name: 'PRINT LINE' }));
      expect(onPrint).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Type an amount above 0.00.');
      const print = screen.getByRole('button', { name: 'FIX 1 ERROR TO PRINT' });
      expect(print).toHaveAttribute('aria-disabled', 'true');

      await user.type(description(), 'x'.repeat(43));
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Description is 43 characters. Keep it to 40.',
      );
      expect(screen.getByRole('button', { name: 'FIX 2 ERRORS TO PRINT' })).toBeInTheDocument();
      expect(description()).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('43/40')).toBeInTheDocument();

      await press(user, '5');
      await user.clear(description());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(description()).not.toHaveAttribute('aria-invalid');
      await user.click(screen.getByRole('button', { name: 'PRINT LINE - S$0.05' }));
      expect(onPrint).toHaveBeenCalledOnce();
    });

    it('keeps the line and says why when it cannot be saved', async () => {
      const { user } = renderNewLine({ result: { ok: false, error: 'storage-full' } });
      await user.type(description(), 'chicken rice');
      await press(user, '5', '8', '0');
      await user.click(screen.getByRole('button', { name: /print line/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't save the line: this browser's storage is full.",
      );
      expect(description()).toHaveValue('chicken rice');
      expect(amount()).toHaveTextContent('S$5.80');
    });
  });

  describe('on the desktop column', () => {
    it('clears for the next line after printing and goes back to the description', async () => {
      const { user } = renderNewLine({ layout: 'column' });
      expect(screen.queryByRole('button', { name: 'CANCEL' })).not.toBeInTheDocument();
      await user.type(description(), 'kopi');
      await press(user, '1', '8', '0');
      await user.click(departments().getByRole('button', { name: 'Transportation' }));
      await user.click(screen.getByRole('button', { name: /print line/i }));
      expect(await screen.findByRole('button', { name: 'PRINT LINE' })).toBeInTheDocument();
      expect(description()).toHaveValue('');
      expect(description()).toHaveFocus();
      expect(amount()).toHaveTextContent('S$0.00');
      expect(departments().getByRole('button', { name: 'Food & dining' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  describe('cancel', () => {
    it('closes straight away when nothing was entered', async () => {
      const { user, onCancel } = renderNewLine();
      await user.click(screen.getByRole('button', { name: 'CANCEL' }));
      expect(onCancel).toHaveBeenCalledOnce();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('asks before throwing a line away, and can keep editing', async () => {
      const { user, onCancel } = renderNewLine();
      await user.type(description(), 'chicken rice');
      await press(user, '5', '8', '0');
      await user.click(screen.getByRole('button', { name: 'CANCEL' }));

      const dialog = within(screen.getByRole('alertdialog', { name: 'DISCARD THIS LINE?' }));
      expect(dialog.getByText('CHICKEN RICE')).toBeInTheDocument();
      expect(dialog.getByRole('button', { name: 'KEEP EDITING' })).toHaveFocus();
      await user.click(dialog.getByRole('button', { name: 'KEEP EDITING' }));
      expect(onCancel).not.toHaveBeenCalled();
      expect(description()).toHaveValue('chicken rice');

      await user.click(screen.getByRole('button', { name: 'CANCEL' }));
      await user.click(screen.getByRole('button', { name: 'DISCARD' }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });
});
