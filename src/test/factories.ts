import type { Expense } from '../domain/types.ts';

let seq = 0;

/** Builds an Expense with sensible defaults; override only what a test cares about. */
export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  seq += 1;
  return {
    id: `exp-${seq}`,
    amountCents: 1000,
    date: '2026-11-05',
    categoryId: 'food',
    createdAt: `2026-11-05T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    ...overrides,
  };
}
