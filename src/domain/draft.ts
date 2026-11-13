import type { ExpenseInput } from '../storage/repository.ts';
import type { CategoryId, LocalDate } from './types.ts';

/** Description limit; longer ones are refused with a message, not cut off. */
export const DESCRIPTION_MAX = 40;
/** Digits the keypad holds: 9,999,999 cents is S$99,999.99. */
export const AMOUNT_MAX_DIGITS = 7;

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | 'del';

/** A line being written on the new-line card, before it is printed. */
export interface Draft {
  /** Amount as typed on the keypad, in cents, without leading zeros ("580" is 5.80). */
  digits: string;
  description: string;
  categoryId: CategoryId;
  date: LocalDate;
}

export type DraftField = 'amount' | 'description' | 'date';

export interface DraftError {
  field: DraftField;
  message: string;
}

export function emptyDraft(date: LocalDate, categoryId: CategoryId = 'food'): Draft {
  return { digits: '', description: '', categoryId, date };
}

/**
 * One keypad press. Digits fill from the right like a till, leading zeros are dropped,
 * and a key that would take the amount past AMOUNT_MAX_DIGITS is ignored whole.
 */
export function pressKey(digits: string, key: KeypadKey): string {
  if (key === 'del') return digits.slice(0, -1);
  const next = (digits + key).replace(/^0+/, '');
  return next.length > AMOUNT_MAX_DIGITS ? digits : next;
}

export function digitsToCents(digits: string): number {
  return digits === '' ? 0 : Number(digits);
}

/** Every problem with a draft, in the order the card shows them. Empty means printable. */
export function validateDraft(draft: Draft, today: LocalDate): DraftError[] {
  const errors: DraftError[] = [];
  if (digitsToCents(draft.digits) <= 0) {
    errors.push({ field: 'amount', message: 'Type an amount above 0.00.' });
  }
  const length = draft.description.trim().length;
  if (length > DESCRIPTION_MAX) {
    errors.push({
      field: 'description',
      message: `Description is ${length} characters. Keep it to ${DESCRIPTION_MAX}.`,
    });
  }
  // The calendar locks future days; this guards anything that gets past it.
  if (draft.date > today) {
    errors.push({ field: 'date', message: 'Pick today or an earlier date.' });
  }
  return errors;
}

/** Repository input for a valid draft. A blank description leaves the note out. */
export function draftToInput(draft: Draft): ExpenseInput {
  const note = draft.description.trim();
  return {
    amountCents: digitsToCents(draft.digits),
    categoryId: draft.categoryId,
    date: draft.date,
    ...(note ? { note } : {}),
  };
}

/** True when cancelling would throw away something the user did. */
export function isDraftDirty(draft: Draft, initial: Draft): boolean {
  return (
    draft.digits !== initial.digits ||
    draft.description.trim() !== initial.description.trim() ||
    draft.categoryId !== initial.categoryId ||
    draft.date !== initial.date
  );
}
