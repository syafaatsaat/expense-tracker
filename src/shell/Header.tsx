import type { MonthKey } from '../domain/types.ts';
import { monthCode } from '../lib/dates.ts';
import { formatAmount, formatCents } from '../lib/money.ts';
import { CURRENCY_SYMBOL } from '../config.ts';
import { DarkCard } from '../ui/DarkCard.tsx';
import { TallText } from '../ui/TallText.tsx';
import { MonthSwitcher } from './MonthSwitcher.tsx';

export interface HeaderTotals {
  spentCents: number;
  savedCents: number;
}

interface HeaderProps {
  month: MonthKey;
  currentMonth: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  /** Null until data has loaded (or when it can't be read). */
  totals: HeaderTotals | null;
}

export function Header({ month, currentMonth, onMonthChange, totals }: HeaderProps) {
  const label = month === currentMonth ? 'SPENT THIS MONTH' : `SPENT IN ${monthCode(month)}`;
  return (
    <header>
      <DarkCard className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3 lg:gap-2 lg:px-3.5 lg:pt-3 lg:pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <h1>
            <TallText sx={3} sy={4} align="start">
              TILL
            </TallText>
          </h1>
          <MonthSwitcher month={month} currentMonth={currentMonth} onChange={onMonthChange} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-t-2 border-dashed border-rule-on-ink pt-2">
          <p className="flex flex-col gap-1">
            <span className="font-pixel text-pixel-8 text-olive">{label}</span>
            <span className="text-total lg:text-total-lg">
              {totals ? formatCents(totals.spentCents) : `${CURRENCY_SYMBOL}—`}
            </span>
          </p>
          <p className="pb-1 font-pixel text-pixel-8 text-olive">
            SAVED {totals ? formatAmount(totals.savedCents) : '—'}
          </p>
        </div>
      </DarkCard>
    </header>
  );
}
