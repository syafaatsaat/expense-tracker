import { addMonths, dateInMonth, monthKey } from '../lib/dates.ts';
import { CURRENT_VERSION, validateRoot } from '../storage/schema.ts';
import { filterExpenses } from './filters.ts';
import { createSeedData } from './seed.ts';
import { summarize } from './totals.ts';
import type { LocalDate } from './types.ts';

function counter() {
  let n = 0;
  return () => `seed-${++n}`;
}

const TODAYS: LocalDate[] = ['2026-11-10', '2026-11-01', '2026-03-31', '2028-03-01', '2027-01-01'];

describe.each(TODAYS)('createSeedData(today = %s)', (today) => {
  const seed = createSeedData(today, counter());
  const months = [-2, -1, 0].map((n) => addMonths(monthKey(today), n));

  it('dates nothing after today', () => {
    for (const e of seed.expenses) expect(e.date <= today).toBe(true);
  });

  it('covers exactly the current month and the two before it', () => {
    expect([...new Set(seed.expenses.map((e) => monthKey(e.date)))].sort()).toEqual(months);
  });

  it('produces a valid storage root', () => {
    const root = {
      version: CURRENT_VERSION,
      ...seed,
      budgets: [],
      settings: { theme: 'system', seeded: true },
    };
    expect(validateRoot(JSON.parse(JSON.stringify(root)))).toMatchObject({ ok: true });
  });

  it('uses unique ids across expenses and templates', () => {
    const ids = [...seed.expenses, ...seed.recurring].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has three active subscriptions whose occurrences match their template', () => {
    expect(seed.recurring).toHaveLength(3);
    for (const t of seed.recurring) {
      const expected = months.map((m) => dateInMonth(m, t.dayOfMonth)).filter((d) => d <= today);
      const occurrences = seed.expenses.filter((e) => e.recurringId === t.id);
      expect(occurrences.map((e) => e.date).sort()).toEqual(expected);
      for (const e of occurrences) {
        expect(e).toMatchObject({ amountCents: t.amountCents, categoryId: t.categoryId });
      }
      expect(t.active).toBe(true);
      expect(t.startDate).toBe(expected[0]);
      expect(t.lastGeneratedDate).toBe(expected.at(-1));
    }
  });

  it('includes spending and savings in the two full months', () => {
    for (const m of months.slice(0, 2)) {
      const summary = summarize(filterExpenses(seed.expenses, { month: m }));
      expect(summary.spentCents).toBeGreaterThan(0);
      expect(summary.savedCents).toBeGreaterThan(0);
      expect(summary.breakdown.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('has data in the current month even on its first day', () => {
    expect(seed.expenses.some((e) => monthKey(e.date) === monthKey(today))).toBe(true);
  });

  it('is deterministic for the same today and id source', () => {
    expect(createSeedData(today, counter())).toEqual(seed);
  });
});

describe('createSeedData sizes', () => {
  it('stays a realistic size', () => {
    const { expenses } = createSeedData('2026-11-28', counter());
    expect(expenses.length).toBeGreaterThanOrEqual(25);
    expect(expenses.length).toBeLessThanOrEqual(60);
  });

  it('clamps day 31 subscriptions in short months', () => {
    const { expenses, recurring } = createSeedData('2026-03-31', counter());
    const monthEnd = recurring.find((t) => t.dayOfMonth === 31);
    expect(monthEnd).toBeDefined();
    const dates = expenses.filter((e) => e.recurringId === monthEnd?.id).map((e) => e.date);
    expect(dates.sort()).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});
