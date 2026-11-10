import type { Expense, RecurringTemplate } from '../domain/types.ts';
import { CURRENT_VERSION, type StorageRoot } from '../storage/schema.ts';

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

export function makeTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  seq += 1;
  return {
    id: `tpl-${seq}`,
    amountCents: 1798,
    categoryId: 'entertainment',
    note: 'Streaming',
    startDate: '2026-09-12',
    dayOfMonth: 12,
    lastGeneratedDate: '2026-11-12',
    active: true,
    ...overrides,
  };
}

/** A valid version-1 storage root as plain JSON-ish data. */
export function makeRoot(overrides: Partial<StorageRoot> = {}): StorageRoot {
  return {
    version: CURRENT_VERSION,
    expenses: [makeExpense(), makeExpense({ categoryId: 'savings', amountCents: 50000 })],
    recurring: [makeTemplate()],
    budgets: [{ categoryId: 'food', monthlyLimitCents: 60000 }],
    settings: { theme: 'system', seeded: true, lastCategoryId: 'food' },
    ...overrides,
  };
}
