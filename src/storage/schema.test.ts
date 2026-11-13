/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment --
   This file breaks stored data on purpose, in ways the types would forbid. */
import { makeExpense, makeRoot, makeTemplate } from '../test/factories.ts';
import { createEmptyRoot, CURRENT_VERSION, validateExpense, validateRoot } from './schema.ts';

/** A valid root as untyped JSON, so tests can break it in ways the types would forbid. */
function rawRoot(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(makeRoot())) as Record<string, unknown>;
}

function breakAt(mutate: (root: any) => void): unknown {
  const root = rawRoot();
  mutate(root);
  return root;
}

describe('validateRoot', () => {
  it('accepts a valid root and returns it', () => {
    const root = makeRoot();
    expect(validateRoot(JSON.parse(JSON.stringify(root)))).toEqual({ ok: true, value: root });
  });

  it('accepts the empty root', () => {
    expect(validateRoot(createEmptyRoot())).toEqual({ ok: true, value: createEmptyRoot() });
  });

  it('drops unknown fields instead of carrying them along', () => {
    const result = validateRoot(
      breakAt((r) => {
        r.extra = 1;
        r.expenses[0].extra = 2;
      }),
    );
    expect(result.ok && 'extra' in result.value).toBe(false);
    expect(result.ok && 'extra' in (result.value.expenses[0] ?? {})).toBe(false);
  });

  it.each<[string, unknown, string]>([
    ['null', null, '(root)'],
    ['an array', [], '(root)'],
    ['a string', 'hello', '(root)'],
    ['a missing version', breakAt((r) => delete r.version), 'version'],
    ['another version', breakAt((r) => (r.version = CURRENT_VERSION + 1)), 'version'],
    ['expenses not an array', breakAt((r) => (r.expenses = {})), 'expenses'],
    [
      'a float amount',
      breakAt((r) => (r.expenses[0].amountCents = 12.5)),
      'expenses[0].amountCents',
    ],
    ['a zero amount', breakAt((r) => (r.expenses[0].amountCents = 0)), 'expenses[0].amountCents'],
    [
      'a string amount',
      breakAt((r) => (r.expenses[1].amountCents = '100')),
      'expenses[1].amountCents',
    ],
    [
      'an amount above the cap',
      breakAt((r) => (r.expenses[0].amountCents = 10_000_000)),
      'expenses[0].amountCents',
    ],
    [
      'an ISO timestamp date',
      breakAt((r) => (r.expenses[0].date = '2026-11-05T00:00:00Z')),
      'expenses[0].date',
    ],
    ['an impossible date', breakAt((r) => (r.expenses[0].date = '2026-02-30')), 'expenses[0].date'],
    [
      'an unknown category',
      breakAt((r) => (r.expenses[0].categoryId = 'pets')),
      'expenses[0].categoryId',
    ],
    ['an empty id', breakAt((r) => (r.expenses[0].id = '')), 'expenses[0].id'],
    ['a numeric note', breakAt((r) => (r.expenses[0].note = 5)), 'expenses[0].note'],
    [
      'a missing createdAt',
      breakAt((r) => delete r.expenses[0].createdAt),
      'expenses[0].createdAt',
    ],
    [
      'duplicate expense ids',
      breakAt((r) => (r.expenses[1].id = r.expenses[0].id)),
      'expenses[1].id',
    ],
    ['dayOfMonth 0', breakAt((r) => (r.recurring[0].dayOfMonth = 0)), 'recurring[0].dayOfMonth'],
    ['dayOfMonth 32', breakAt((r) => (r.recurring[0].dayOfMonth = 32)), 'recurring[0].dayOfMonth'],
    [
      'a non-boolean active',
      breakAt((r) => (r.recurring[0].active = 'yes')),
      'recurring[0].active',
    ],
    [
      'endDate before startDate',
      breakAt((r) => (r.recurring[0].endDate = '2026-01-01')),
      'recurring[0].endDate',
    ],
    [
      'a budget on Savings',
      breakAt((r) => (r.budgets[0].categoryId = 'savings')),
      'budgets[0].categoryId',
    ],
    [
      'a zero budget',
      breakAt((r) => (r.budgets[0].monthlyLimitCents = 0)),
      'budgets[0].monthlyLimitCents',
    ],
    [
      'two budgets for one category',
      breakAt((r) => r.budgets.push({ categoryId: 'food', monthlyLimitCents: 1 })),
      'budgets[1].categoryId',
    ],
    ['an unknown theme', breakAt((r) => (r.settings.theme = 'sepia')), 'settings.theme'],
    ['a non-boolean seeded', breakAt((r) => (r.settings.seeded = 1)), 'settings.seeded'],
    [
      'an unknown lastCategoryId',
      breakAt((r) => (r.settings.lastCategoryId = 'pets')),
      'settings.lastCategoryId',
    ],
    ['settings missing', breakAt((r) => delete r.settings), 'settings'],
  ])('rejects %s, pointing at %s', (_name, value, path) => {
    const result = validateRoot(value);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.path).toBe(path);
      expect(result.reason).not.toBe('');
    }
  });

  it('accepts optional fields when absent', () => {
    const root = makeRoot({
      expenses: [makeExpense()],
      recurring: [makeTemplate({ lastGeneratedDate: undefined, note: undefined })],
      settings: { theme: 'dark', seeded: false },
    });
    expect(validateRoot(JSON.parse(JSON.stringify(root))).ok).toBe(true);
  });
});

describe('validateExpense', () => {
  it('accepts a valid expense', () => {
    const expense = makeExpense({ note: 'Lunch', recurringId: 'tpl-1' });
    expect(validateExpense(expense)).toEqual({ ok: true, value: expense });
  });

  it('rejects an invalid one with a path', () => {
    expect(validateExpense({ ...makeExpense(), amountCents: -1 })).toMatchObject({
      ok: false,
      path: 'amountCents',
    });
  });
});
