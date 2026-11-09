import { makeExpense } from '../test/factories.ts';
import { apportion, summarize } from './totals.ts';

describe('apportion', () => {
  it('splits proportionally when the shares are exact', () => {
    expect(apportion([1, 1, 2], 1000)).toEqual([250, 250, 500]);
  });

  it('always sums to the scale, using largest remainders', () => {
    // 1/3 each: 333.33… → two get 333, the one with the largest remainder gets 334.
    const parts = apportion([1, 1, 1], 1000);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect([...parts].sort()).toEqual([333, 333, 334]);
  });

  it('breaks remainder ties by input order, so output is deterministic', () => {
    expect(apportion([1, 1, 1], 1000)).toEqual([334, 333, 333]);
  });

  it('gives the extra unit to the largest remainder, not the largest weight', () => {
    // 0.6667 → 666.67, 0.3333 → 333.33: the first has the larger remainder.
    expect(apportion([2, 1], 1000)).toEqual([667, 333]);
  });

  it('returns zeros when the weights sum to zero', () => {
    expect(apportion([0, 0], 1000)).toEqual([0, 0]);
  });

  it('returns an empty list for no weights', () => {
    expect(apportion([], 1000)).toEqual([]);
  });

  it('sums to the scale for many awkward weights', () => {
    const weights = [1999, 7, 333, 12345, 1, 1, 88888, 4];
    const parts = apportion(weights, 1000);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    for (const p of parts) expect(Number.isInteger(p)).toBe(true);
  });

  it('rejects negative or non-integer weights', () => {
    expect(() => apportion([1, -1], 1000)).toThrow(RangeError);
    expect(() => apportion([1.5], 1000)).toThrow(RangeError);
  });
});

describe('summarize', () => {
  it('returns zeros and an empty breakdown for no expenses', () => {
    expect(summarize([])).toEqual({ spentCents: 0, savedCents: 0, breakdown: [] });
  });

  it('totals spending in integer cents', () => {
    const result = summarize([
      makeExpense({ amountCents: 10, categoryId: 'food' }),
      makeExpense({ amountCents: 20, categoryId: 'food' }),
    ]);
    expect(result.spentCents).toBe(30);
  });

  it('splits Savings & investments out as Saved, not spending', () => {
    const result = summarize([
      makeExpense({ amountCents: 5000, categoryId: 'food' }),
      makeExpense({ amountCents: 20000, categoryId: 'savings' }),
      makeExpense({ amountCents: 30000, categoryId: 'savings' }),
    ]);
    expect(result.spentCents).toBe(5000);
    expect(result.savedCents).toBe(50000);
    expect(result.breakdown.map((b) => b.categoryId)).toEqual(['food']);
    expect(result.breakdown[0]?.permille).toBe(1000);
  });

  it('counts Debts & loans as spending', () => {
    const result = summarize([makeExpense({ amountCents: 700, categoryId: 'debts' })]);
    expect(result.spentCents).toBe(700);
    expect(result.savedCents).toBe(0);
  });

  it('handles a month with only savings', () => {
    const result = summarize([makeExpense({ amountCents: 1000, categoryId: 'savings' })]);
    expect(result).toEqual({ spentCents: 0, savedCents: 1000, breakdown: [] });
  });

  it('groups by category, sorted by amount (largest first)', () => {
    const result = summarize([
      makeExpense({ amountCents: 100, categoryId: 'food' }),
      makeExpense({ amountCents: 900, categoryId: 'housing' }),
      makeExpense({ amountCents: 250, categoryId: 'food' }),
      makeExpense({ amountCents: 500, categoryId: 'transport' }),
    ]);
    expect(result.breakdown).toEqual([
      { categoryId: 'housing', amountCents: 900, permille: 514 },
      { categoryId: 'transport', amountCents: 500, permille: 286 },
      { categoryId: 'food', amountCents: 350, permille: 200 },
    ]);
  });

  it('breaks amount ties by the fixed category order', () => {
    const result = summarize([
      makeExpense({ amountCents: 100, categoryId: 'other' }),
      makeExpense({ amountCents: 100, categoryId: 'utilities' }),
      makeExpense({ amountCents: 100, categoryId: 'housing' }),
    ]);
    expect(result.breakdown.map((b) => b.categoryId)).toEqual(['housing', 'utilities', 'other']);
  });

  it('breakdown amounts sum to the spending total and percentages to exactly 100.0%', () => {
    const result = summarize([
      makeExpense({ amountCents: 333, categoryId: 'food' }),
      makeExpense({ amountCents: 333, categoryId: 'transport' }),
      makeExpense({ amountCents: 334, categoryId: 'utilities' }),
      makeExpense({ amountCents: 1, categoryId: 'other' }),
      makeExpense({ amountCents: 999, categoryId: 'savings' }),
    ]);
    const amountSum = result.breakdown.reduce((s, b) => s + b.amountCents, 0);
    const permilleSum = result.breakdown.reduce((s, b) => s + b.permille, 0);
    expect(amountSum).toBe(result.spentCents);
    expect(permilleSum).toBe(1000);
  });

  it('omits categories with no expenses', () => {
    const result = summarize([makeExpense({ categoryId: 'food' })]);
    expect(result.breakdown).toHaveLength(1);
  });

  it('rejects a non-integer amount instead of drifting', () => {
    expect(() => summarize([makeExpense({ amountCents: 10.5 })])).toThrow(RangeError);
  });
});
