import { CURRENCY, CURRENCY_SYMBOL, LOCALE } from '../config.ts';

/** Largest accepted amount: $999,999.99. */
export const MAX_AMOUNT_CENTS = 99_999_999;

export type AmountError = 'empty' | 'invalid' | 'too-many-decimals' | 'not-positive' | 'too-large';

export type ParseAmountResult = { ok: true; cents: number } | { ok: false; error: AmountError };

// Optional "$" or "S$", whole part with or without correct thousands commas, optional
// fraction. Signs are handled before this runs.
const AMOUNT_PATTERN = /^(?:S?\$)?(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/i;

/**
 * Parses what the user typed into integer cents, working on the string digits so no float
 * arithmetic touches the amount. Valid amounts are > 0, have at most 2 decimals and are at
 * most MAX_AMOUNT_CENTS.
 */
export function parseAmount(input: string): ParseAmountResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };

  const negative = trimmed.startsWith('-');
  const match = AMOUNT_PATTERN.exec(negative ? trimmed.slice(1) : trimmed);
  if (!match) return { ok: false, error: 'invalid' };

  const whole = (match[1] ?? '').replaceAll(',', '').replace(/^0+(?=\d)/, '');
  const fraction = match[2] ?? '';
  if (whole === '' && fraction === '') return { ok: false, error: 'invalid' };
  if (fraction.length > 2) return { ok: false, error: 'too-many-decimals' };

  // Checked before Number() so huge inputs cannot lose precision.
  const maxWholeDigits = String(Math.floor(MAX_AMOUNT_CENTS / 100)).length;
  if (whole.length > maxWholeDigits) return { ok: false, error: 'too-large' };

  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  if (negative || cents === 0) return { ok: false, error: 'not-positive' };
  if (cents > MAX_AMOUNT_CENTS) return { ok: false, error: 'too-large' };
  return { ok: true, cents };
}

const formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) throw new RangeError(`Expected integer cents, got ${cents}`);
}

function parts(cents: number): Intl.NumberFormatPart[] {
  assertCents(cents);
  return formatter.formatToParts(cents / 100);
}

/** Formats cents for display, e.g. 1250 → "S$12.50". All money display goes through this file. */
export function formatCents(cents: number): string {
  return parts(cents)
    .map((p) => (p.type === 'currency' ? CURRENCY_SYMBOL : p.value))
    .join('');
}

/** Grouped amount without a symbol, for receipt lines and SAVED: 50000 → "500.00". */
export function formatAmount(cents: number): string {
  return parts(cents)
    .filter((p) => p.type !== 'currency' && p.type !== 'literal')
    .map((p) => p.value)
    .join('');
}

/** Plain decimal string with no symbol or grouping, e.g. 1250 → "12.50". For inputs and CSV. */
export function centsToDecimalString(cents: number): string {
  assertCents(cents);
  const abs = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
