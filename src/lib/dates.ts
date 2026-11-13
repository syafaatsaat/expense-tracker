import type { LocalDate, MonthKey } from '../domain/types.ts';

// Expense dates are local calendar strings, compared and sliced as text. No function here
// reads the clock: the app turns `new Date()` into "today" once, with toLocalDate, and
// passes it in.

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a month; `month` is 1 to 12. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** The local calendar date of a moment, e.g. "today" from `new Date()` at the app edge. */
export function toLocalDate(moment: Date): LocalDate {
  if (Number.isNaN(moment.getTime())) throw new RangeError('Invalid Date');
  return `${pad4(moment.getFullYear())}-${pad2(moment.getMonth() + 1)}-${pad2(moment.getDate())}` as LocalDate;
}

/** True for a real calendar date in strict `YYYY-MM-DD` form (so not 2026-02-30). */
export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function isMonthKey(value: string): value is MonthKey {
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function monthKey(date: LocalDate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

function splitMonthKey(key: MonthKey): [year: number, month: number] {
  return [Number(key.slice(0, 4)), Number(key.slice(5, 7))];
}

/** First and last day of a month, both inclusive. */
export function monthRange(key: MonthKey): { start: LocalDate; end: LocalDate } {
  const [year, month] = splitMonthKey(key);
  return {
    start: `${key}-01` as LocalDate,
    end: `${key}-${pad2(daysInMonth(year, month))}` as LocalDate,
  };
}

/** Moves a month key forwards (positive n) or backwards (negative n). */
export function addMonths(key: MonthKey, n: number): MonthKey {
  const [year, month] = splitMonthKey(key);
  const index = year * 12 + (month - 1) + n;
  return `${pad4(Math.floor(index / 12))}-${pad2((index % 12) + 1)}` as MonthKey;
}

/** Last day of a month, e.g. "2026-11-30". */
export function lastDayOfMonth(key: MonthKey): LocalDate {
  return monthRange(key).end;
}

/**
 * Moves a date forwards (positive n) or backwards (negative n) by whole days, stepping
 * through the calendar fields so no Date or timezone is involved.
 */
export function addDays(date: LocalDate, n: number): LocalDate {
  if (!Number.isInteger(n)) throw new RangeError(`Invalid day count: ${n}`);
  let year = Number(date.slice(0, 4));
  let month = Number(date.slice(5, 7));
  let day = Number(date.slice(8, 10)) + n;
  while (day < 1) {
    month -= 1;
    if (month < 1) [year, month] = [year - 1, 12];
    day += daysInMonth(year, month);
  }
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}` as LocalDate;
}

export function isInMonth(date: LocalDate, key: MonthKey): boolean {
  return monthKey(date) === key;
}

/** The given day (1 to 31) of a month, clamped to the month's last day: 31 → 30 Nov, 28/29 Feb. */
export function dateInMonth(key: MonthKey, day: number): LocalDate {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new RangeError(`Invalid day: ${day}`);
  const [year, month] = splitMonthKey(key);
  return `${key}-${pad2(Math.min(day, daysInMonth(year, month)))}` as LocalDate;
}

// Month names are fixed English receipt codes, not Intl output: en-SG abbreviates
// September as "Sept", and the design needs three letters.
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function monthName(key: MonthKey): string {
  return MONTH_NAMES[splitMonthKey(key)[1] - 1] ?? '';
}

/** Three-letter code, e.g. "NOV". */
export function monthCode(key: MonthKey): string {
  return monthName(key).slice(0, 3).toUpperCase();
}

/** Receipt-style label, e.g. "NOV 2026". */
export function formatMonthShort(key: MonthKey): string {
  return `${monthCode(key)} ${key.slice(0, 4)}`;
}

/** Spoken label, e.g. "November 2026". */
export function formatMonthLong(key: MonthKey): string {
  return `${monthName(key)} ${key.slice(0, 4)}`;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// Sakamoto's method: the weekday from the calendar fields alone, so no Date and no timezone.
const SAKAMOTO = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;

function weekdayIndex(date: LocalDate): number {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const year = Number(date.slice(0, 4)) - (month < 3 ? 1 : 0);
  const offset = SAKAMOTO[month - 1] ?? 0;
  return (
    (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + offset + day) %
    7
  );
}

/** Three-letter weekday, e.g. "TUE". */
export function weekdayCode(date: LocalDate): string {
  return (WEEKDAY_NAMES[weekdayIndex(date)] ?? '').slice(0, 3).toUpperCase();
}

/** Receipt day header, e.g. "TUE 10 NOV". */
export function formatDayHeader(date: LocalDate): string {
  return `${weekdayCode(date)} ${date.slice(8, 10)} ${monthCode(monthKey(date))}`;
}

/** Spoken day, e.g. "Tuesday 10 November". */
export function formatDayLong(date: LocalDate): string {
  const weekday = WEEKDAY_NAMES[weekdayIndex(date)] ?? '';
  return `${weekday} ${Number(date.slice(8, 10))} ${monthName(monthKey(date))}`;
}

/** Receipt number for a month, e.g. "10/2026". */
export function formatReceiptNumber(key: MonthKey): string {
  return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

/** Blank cells before the 1st in a Monday-first calendar: 0 when the month starts on a Monday. */
export function mondayOffset(key: MonthKey): number {
  return (weekdayIndex(`${key}-01` as LocalDate) + 6) % 7;
}
