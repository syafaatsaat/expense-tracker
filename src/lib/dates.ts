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
