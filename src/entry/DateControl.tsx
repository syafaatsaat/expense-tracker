import type { LocalDate } from '../domain/types.ts';
import { addDays, formatDayHeader, formatDayLong } from '../lib/dates.ts';
import { Keycap } from '../ui/Keycap.tsx';
import { PixelIcon } from '../ui/PixelIcon.tsx';

interface DateControlProps {
  today: LocalDate;
  value: LocalDate;
  onChange: (date: LocalDate) => void;
  onPick: () => void;
}

/** TODAY / YESTERDAY / PICK DATE. Exactly one is down; a picked date shows on its key. */
export function DateControl({ today, value, onChange, onPick }: DateControlProps) {
  const yesterday = addDays(today, -1);
  const isToday = value === today;
  const isYesterday = value === yesterday;
  const isPicked = !isToday && !isYesterday;
  const text = 'font-pixel text-pixel-8';
  return (
    <div className="mx-[3px] mt-2 mb-2.5 flex gap-2.5">
      <Keycap
        variant={isToday ? 'paper' : 'key'}
        pressed={isToday}
        onClick={() => onChange(today)}
        className={`h-11 flex-[1] ${text}`}
      >
        TODAY
      </Keycap>
      <Keycap
        variant={isYesterday ? 'paper' : 'key'}
        pressed={isYesterday}
        onClick={() => onChange(yesterday)}
        className={`h-11 flex-[1.2] ${text}`}
      >
        YESTERDAY
      </Keycap>
      <Keycap
        variant={isPicked ? 'paper' : 'key'}
        pressed={isPicked}
        aria-haspopup="dialog"
        onClick={onPick}
        className={`flex h-11 flex-[1.5] items-center justify-center gap-2 whitespace-nowrap ${text}`}
      >
        <PixelIcon name="calendar" className="shrink-0" />
        {isPicked ? (
          <>
            <span aria-hidden="true">{formatDayHeader(value)}</span>
            <span className="sr-only">Pick date, {formatDayLong(value)} picked</span>
          </>
        ) : (
          'PICK DATE'
        )}
      </Keycap>
    </div>
  );
}
