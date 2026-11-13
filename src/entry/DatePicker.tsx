import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { LocalDate, MonthKey } from '../domain/types.ts';
import {
  addDays,
  addMonths,
  dateInMonth,
  daysInMonth,
  formatDayLong,
  formatMonthShort,
  isInMonth,
  monthKey,
  mondayOffset,
} from '../lib/dates.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { Keycap } from '../ui/Keycap.tsx';
import { PixelIcon } from '../ui/PixelIcon.tsx';

interface DatePickerProps {
  open: boolean;
  today: LocalDate;
  selected: LocalDate;
  onPick: (date: LocalDate) => void;
  onClose: () => void;
}

/** Calendar sheet: Monday-first, today outlined red, future days locked. */
export function DatePicker({ open, onClose, ...props }: DatePickerProps) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} placement="sheet" labelledBy={titleId}>
      <Calendar titleId={titleId} onClose={onClose} {...props} />
    </Dialog>
  );
}

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

function Calendar({
  titleId,
  today,
  selected,
  onPick,
  onClose,
}: Omit<DatePickerProps, 'open'> & { titleId: string }) {
  const [view, setView] = useState<MonthKey>(monthKey(selected));
  // The one day in the tab order (roving tabindex); arrow keys move it.
  const [focusDate, setFocusDate] = useState<LocalDate>(selected);
  const moved = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const atLatest = view >= monthKey(today);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate]);

  const tabbable = isInMonth(focusDate, view)
    ? focusDate
    : isInMonth(selected, view)
      ? selected
      : dateInMonth(view, 1);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = ARROWS[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const from = tabbable;
    let next = addDays(from, delta);
    if (next > today) next = today;
    moved.current = true;
    setFocusDate(next);
    setView(monthKey(next));
  };

  const [year, month] = [Number(view.slice(0, 4)), Number(view.slice(5, 7))];
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => dateInMonth(view, i + 1));

  return (
    <div className="paper-panel flex flex-col gap-2.5 px-3.5 pt-3 pb-3.5">
      <h2 id={titleId} className="sr-only">
        Pick a date
      </h2>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView(addMonths(view, -1))}
          className="flex size-11 items-center justify-center"
        >
          <PixelIcon name="chevron-left" />
        </button>
        <p aria-live="polite" className="font-pixel text-pixel-16">
          {formatMonthShort(view)}
        </p>
        <button
          type="button"
          aria-label="Next month"
          aria-disabled={atLatest || undefined}
          onClick={() => {
            if (!atLatest) setView(addMonths(view, 1));
          }}
          className={`flex size-11 items-center justify-center ${atLatest ? 'cursor-not-allowed text-locked-on-paper' : ''}`}
        >
          <PixelIcon name="chevron-right" />
        </button>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1.5 text-center font-pixel text-pixel-8 text-muted"
      >
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div
        ref={grid}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-x-1.5 gap-y-[13px] px-[3px] pt-[3px] pb-[9px]"
      >
        {Array.from({ length: mondayOffset(view) }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {days.map((date) => {
          const future = date > today;
          const isToday = date === today;
          const isSelected = date === selected;
          const label = `${formatDayLong(date)}${isToday ? ', today' : ''}${future ? ', unavailable' : ''}`;
          const common = {
            'aria-label': label,
            'data-date': date,
            'data-autofocus': date === tabbable ? true : undefined,
            tabIndex: date === tabbable ? 0 : -1,
          };
          if (future) {
            return (
              <button
                key={date}
                type="button"
                aria-disabled="true"
                {...common}
                className="h-11 cursor-not-allowed text-[22px] text-locked-on-paper shadow-[0_0_0_2px_var(--color-locked-edge)]"
              >
                {Number(date.slice(8))}
              </button>
            );
          }
          return (
            <Keycap
              key={date}
              variant={isSelected ? 'selected' : 'paper'}
              pressed={isSelected}
              onClick={() => onPick(date)}
              style={
                {
                  '--bd': isToday ? 'var(--color-red)' : 'var(--color-ink)',
                  '--side': isSelected ? 'var(--color-ink-edge)' : 'var(--color-paper-side)',
                } as CSSProperties
              }
              {...common}
              className="h-11 p-0 text-[22px]"
            >
              {Number(date.slice(8))}
            </Keycap>
          );
        })}
      </div>

      <p className="flex items-center gap-3.5 font-pixel text-pixel-8 text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 shadow-[0_0_0_2px_var(--color-red)]" />
          TODAY
        </span>
        FUTURE DAYS ARE LOCKED
      </p>

      <div className="flex items-center justify-between border-t-2 border-dashed border-paper-side pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 font-pixel text-pixel-8 text-ink underline"
        >
          CANCEL
        </button>
        <Keycap
          variant="ink"
          onClick={() => onPick(today)}
          className="mb-[9px] h-11 px-3 font-pixel text-pixel-8"
        >
          BACK TO TODAY
        </Keycap>
      </div>
    </div>
  );
}
