import { useEffect, useId, useMemo, useState } from 'react';
import { groupByDay, previewGroups, sortForReceipt } from '../domain/receipt.ts';
import type { Expense, LocalDate, MonthKey } from '../domain/types.ts';
import {
  formatDayHeader,
  formatDayLong,
  formatMonthLong,
  formatReceiptNumber,
  monthCode,
} from '../lib/dates.ts';
import { formatAmount, formatCents } from '../lib/money.ts';
import { Barcode } from '../ui/Barcode.tsx';
import { PixelIcon } from '../ui/PixelIcon.tsx';
import { Stamp } from '../ui/Stamp.tsx';
import { TallText } from '../ui/TallText.tsx';
import { Teeth } from '../ui/Teeth.tsx';
import { ReceiptLine } from './ReceiptLine.tsx';

/** Lines printed before the "show more" marker (rounded to whole days). */
export const PREVIEW_LINES = 8;

interface ReceiptProps {
  month: MonthKey;
  currentMonth: MonthKey;
  /** The month's expenses, in any order. */
  expenses: readonly Expense[];
  totals: { spentCents: number; savedCents: number };
  onBackToCurrent: () => void;
  /**
   * The line just printed: highlighted until the next action. `n` counts prints, so the
   * paper feed replays for each one.
   */
  fresh?: { id: string; n: number } | null;
}

/**
 * The month's receipt. The current month hangs from the printer slot; past months are
 * torn off and closed. Long months print a preview and a marker that prints the rest.
 * Render with `key={month}` so the expanded state resets per month.
 */
export function Receipt({
  month,
  currentMonth,
  expenses,
  totals,
  onBackToCurrent,
  fresh = null,
}: ReceiptProps) {
  const id = useId();
  const torn = month < currentMonth;
  const groups = useMemo(() => groupByDay(sortForReceipt(expenses)), [expenses]);
  const preview = useMemo(() => previewGroups(groups, PREVIEW_LINES), [groups]);
  const [expanded, setExpanded] = useState(false);
  const [focusDay, setFocusDay] = useState<LocalDate | null>(null);
  // A line just printed among the earlier days opens the receipt, so it is never hidden.
  const freshHidden =
    fresh !== null && !preview.visible.some((g) => g.lines.some((l) => l.id === fresh.id));
  const showAll = expanded || freshHidden;
  const visible = showAll ? groups : preview.visible;
  const dayId = (date: LocalDate) => `${id}-day-${date}`;

  // After "show more", move focus to the first newly printed day so keyboard and
  // screen-reader users land on the new lines rather than on a vanished button.
  useEffect(() => {
    if (focusDay) document.getElementById(dayId(focusDay))?.focus();
    // dayId only depends on the stable id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDay]);

  const showMore = () => {
    setExpanded(true);
    setFocusDay(groups[preview.visible.length]?.date ?? null);
  };

  const hidden = preview.hiddenCount;
  const lineCount = expenses.length;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col">
      <h2 id={`${id}-title`} className="sr-only">
        Receipt, {formatMonthLong(month)}
      </h2>

      {torn ? (
        <div className="flex items-center justify-between gap-2">
          <p className="font-pixel text-pixel-8 text-olive">PAST MONTH · TORN OFF</p>
          <button
            type="button"
            onClick={onBackToCurrent}
            className="flex h-11 items-center gap-1.5 font-pixel text-pixel-8 text-light underline"
          >
            BACK TO {monthCode(currentMonth)}
            <PixelIcon name="chevron-right" />
          </button>
        </div>
      ) : (
        <div aria-hidden="true" className="relative z-10 -mx-[3px] h-2 bg-ink-deep" />
      )}

      {/* Clipped at the top only, so the feed slides out from under the slot. */}
      <div
        key={fresh?.n ?? 0}
        className={`mx-[7px] [clip-path:inset(0_-24px_-24px_-24px)] ${torn ? 'mt-1' : '-mt-1.5'}`}
      >
        <div className={fresh ? 'paper-feed' : undefined}>
          {torn ? <Teeth edge="top" /> : null}
          <div
            className={`paper hard-shadow flex flex-col px-4 ${torn ? 'gap-1.5 pt-2.5 pb-3' : 'gap-2 pt-[18px] pb-3.5'}`}
          >
            {torn ? (
              <div className="flex items-center justify-between gap-2">
                <p className="font-pixel text-pixel-8 text-muted">
                  RECEIPT {formatReceiptNumber(month)} · {lineCount}{' '}
                  {lineCount === 1 ? 'LINE' : 'LINES'}
                </p>
                <Stamp>CLOSED</Stamp>
              </div>
            ) : null}

            {groups.length === 0 ? (
              <p className="py-2 text-center font-pixel text-pixel-8 text-muted">
                NO LINES PRINTED
              </p>
            ) : (
              visible.map((group) => (
                <div key={group.date} className="flex flex-col">
                  <h3
                    id={dayId(group.date)}
                    tabIndex={-1}
                    className="font-pixel text-pixel-8 text-muted"
                  >
                    <span aria-hidden="true">{formatDayHeader(group.date)}</span>
                    <span className="sr-only">{formatDayLong(group.date)}</span>
                  </h3>
                  <ul>
                    {group.lines.map((expense) => (
                      <ReceiptLine
                        key={expense.id}
                        expense={expense}
                        fresh={expense.id === fresh?.id}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}

            {!showAll && hidden > 0 ? (
              <button
                type="button"
                aria-expanded="false"
                onClick={showMore}
                className="min-h-11 font-pixel text-pixel-8 text-muted"
              >
                - - SHOW {hidden} {torn ? 'MORE' : 'EARLIER'} {hidden === 1 ? 'LINE' : 'LINES'} - -
              </button>
            ) : null}

            <div aria-hidden="true" className="my-0.5 h-1.5 border-y-2 border-ink" />
            <p className="flex items-baseline justify-between gap-2">
              <TallText sx={2} sy={3} align="start">
                TOTAL SPENT
              </TallText>
              <span className="text-footer text-red">{formatCents(totals.spentCents)}</span>
            </p>
            <p className="flex justify-between gap-2 text-line">
              <span>SAVED, NOT SPENT</span>
              <span>{formatAmount(totals.savedCents)}</span>
            </p>
            <Barcode />
          </div>
          <Teeth edge="bottom" />
        </div>
      </div>
    </section>
  );
}
