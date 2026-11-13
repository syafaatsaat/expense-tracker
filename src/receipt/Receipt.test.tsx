import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense, MonthKey } from '../domain/types.ts';
import { makeExpense } from '../test/factories.ts';
import { Receipt } from './Receipt.tsx';

function renderReceipt(
  expenses: Expense[],
  {
    month = '2026-11',
    totals = { spentCents: 0, savedCents: 0 },
    fresh = null,
  }: {
    month?: MonthKey;
    totals?: { spentCents: number; savedCents: number };
    fresh?: { id: string; n: number } | null;
  } = {},
) {
  const onBackToCurrent = vi.fn();
  render(
    <Receipt
      month={month}
      currentMonth="2026-11"
      expenses={expenses}
      totals={totals}
      onBackToCurrent={onBackToCurrent}
      fresh={fresh}
    />,
  );
  return { onBackToCurrent, user: userEvent.setup() };
}

/** n lines on one day, createdAt descending so order is predictable. */
function lines(date: string, n: number, prefix: string): Expense[] {
  return Array.from({ length: n }, (_, i) =>
    makeExpense({
      id: `${prefix}${i}`,
      date: date as Expense['date'],
      note: `${prefix} item ${i}`,
      createdAt: `${date}T0${9 - i}:00:00.000Z`,
    }),
  );
}

describe('Receipt', () => {
  it('is a labelled region for the month', () => {
    renderReceipt([]);
    expect(screen.getByRole('region', { name: 'Receipt, November 2026' })).toBeInTheDocument();
  });

  it('prints days newest first, with receipt-style and spoken headers', () => {
    renderReceipt([
      makeExpense({ date: '2026-11-08', note: 'Older' }),
      makeExpense({ date: '2026-11-10', note: 'Newer' }),
    ]);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      'TUE 10 NOVTuesday 10 November',
      'SUN 08 NOVSunday 8 November',
    ]);
    expect(screen.getByText('TUE 10 NOV')).toHaveAttribute('aria-hidden', 'true');
  });

  it('prints each line with its description, department and amount', () => {
    renderReceipt([makeExpense({ categoryId: 'food', note: 'Chicken rice', amountCents: 580 })]);
    const line = screen.getByRole('listitem');
    expect(within(line).getByText('Chicken rice')).toHaveClass('uppercase');
    expect(within(line).getByText('Food & dining')).toHaveClass('sr-only');
    expect(within(line).getByText('5.80')).toHaveAttribute('aria-hidden', 'true');
    expect(within(line).getByText('S$5.80')).toHaveClass('sr-only');
  });

  it('uses the department name when a line has no note', () => {
    renderReceipt([makeExpense({ categoryId: 'transport', note: undefined })]);
    expect(within(screen.getByRole('listitem')).getAllByText('Transportation')).not.toHaveLength(0);
  });

  it('prints the footer from the totals', () => {
    renderReceipt([makeExpense()], { totals: { spentCents: 259065, savedCents: 50000 } });
    expect(screen.getByText('TOTAL SPENT')).toBeInTheDocument();
    expect(screen.getByText('S$2,590.65')).toBeInTheDocument();
    expect(screen.getByText('SAVED, NOT SPENT').nextSibling).toHaveTextContent('500.00');
  });

  it('says so when the month has no lines', () => {
    renderReceipt([]);
    expect(screen.getByText('NO LINES PRINTED')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  describe('long months', () => {
    const month = [
      ...lines('2026-11-10', 3, 'a'),
      ...lines('2026-11-09', 3, 'b'),
      ...lines('2026-11-08', 4, 'c'),
    ];

    it('prints whole days up to the preview limit and offers the rest', () => {
      renderReceipt(month);
      expect(screen.getAllByRole('listitem')).toHaveLength(6);
      const more = screen.getByRole('button', { name: '- - SHOW 4 EARLIER LINES - -' });
      expect(more).toHaveAttribute('aria-expanded', 'false');
    });

    it('prints the rest and moves focus to the first revealed day', async () => {
      const { user } = renderReceipt(month);
      await user.click(screen.getByRole('button', { name: /show 4 earlier lines/i }));
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
      expect(screen.queryByRole('button', { name: /earlier lines/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /sunday 8 november/i })).toHaveFocus();
    });
  });

  describe('a past month', () => {
    it('is torn off and closed, with the line count', () => {
      renderReceipt(lines('2026-10-20', 2, 'o'), { month: '2026-10' });
      expect(screen.getByText('CLOSED')).toBeInTheDocument();
      expect(screen.getByText('RECEIPT 10/2026 · 2 LINES')).toBeInTheDocument();
      expect(screen.getByText('PAST MONTH · TORN OFF')).toBeInTheDocument();
    });

    it('says MORE rather than EARLIER on the collapse marker', () => {
      renderReceipt(lines('2026-10-20', 9, 'o').concat(lines('2026-10-19', 1, 'p')), {
        month: '2026-10',
      });
      expect(screen.getByRole('button', { name: '- - SHOW 1 MORE LINE - -' })).toBeInTheDocument();
    });

    it('links back to the current month', async () => {
      const { onBackToCurrent, user } = renderReceipt([], { month: '2026-10' });
      await user.click(screen.getByRole('button', { name: /back to nov/i }));
      expect(onBackToCurrent).toHaveBeenCalledOnce();
    });

    it('does not show torn-off details on the current month', () => {
      renderReceipt([]);
      expect(screen.queryByText('CLOSED')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to/i })).not.toBeInTheDocument();
    });
  });

  describe('a just-printed line', () => {
    it('is marked new, for sight and for screen readers', () => {
      renderReceipt(
        [makeExpense({ id: 'a', note: 'Kopi' }), makeExpense({ id: 'b', note: 'Toast' })],
        {
          fresh: { id: 'b', n: 1 },
        },
      );
      const items = screen.getAllByRole('listitem');
      const toast = items.find((li) => li.textContent?.includes('Toast'));
      const kopi = items.find((li) => li.textContent?.includes('Kopi'));
      expect(toast).toHaveTextContent(/new line/i);
      expect(within(toast!).getByText('NEW')).toBeInTheDocument();
      expect(kopi).not.toHaveTextContent(/new line/i);
    });

    it('opens a collapsed receipt when the line printed among the earlier days', () => {
      const month = lines('2026-11-12', 8, 'n').concat(lines('2026-11-02', 1, 'old'));
      renderReceipt(month, { fresh: { id: 'old0', n: 1 } });
      expect(screen.getByText('old item 0')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /show/i })).not.toBeInTheDocument();
    });
  });
});
