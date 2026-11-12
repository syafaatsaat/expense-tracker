import type { MonthKey } from '../domain/types.ts';
import { addMonths, formatMonthLong, formatMonthShort } from '../lib/dates.ts';
import { PixelIcon } from '../ui/PixelIcon.tsx';

interface MonthSwitcherProps {
  month: MonthKey;
  /** The month containing today. Later months are locked. */
  currentMonth: MonthKey;
  onChange: (month: MonthKey) => void;
}

const arrow = 'flex size-11 items-center justify-center';

export function MonthSwitcher({ month, currentMonth, onChange }: MonthSwitcherProps) {
  const atLatest = month >= currentMonth;
  return (
    <div role="group" aria-label="Month" className="flex items-center">
      <button
        type="button"
        aria-label="Previous month"
        className={`${arrow} text-light`}
        onClick={() => onChange(addMonths(month, -1))}
      >
        <PixelIcon name="chevron-left" />
      </button>
      {/* Fixed width so the arrows don't shift as the month name changes. */}
      <p aria-live="polite" className="w-[7.5em] text-center font-pixel text-pixel-16">
        <span aria-hidden="true">{formatMonthShort(month)}</span>
        <span className="sr-only">{formatMonthLong(month)}</span>
      </p>
      {/* aria-disabled rather than disabled, so keyboard focus stays put on the last month. */}
      <button
        type="button"
        aria-label="Next month"
        aria-disabled={atLatest || undefined}
        className={`${arrow} ${atLatest ? 'cursor-not-allowed text-locked-on-ink' : 'text-light'}`}
        onClick={() => {
          if (!atLatest) onChange(addMonths(month, 1));
        }}
      >
        <PixelIcon name="chevron-right" />
      </button>
    </div>
  );
}
