import { makeExpense } from '../test/factories.ts';
import { filterExpenses } from './filters.ts';

const oct31 = makeExpense({ date: '2026-10-31', categoryId: 'food' });
const nov1 = makeExpense({ date: '2026-11-01', categoryId: 'food' });
const nov30 = makeExpense({ date: '2026-11-30', categoryId: 'transport' });
const dec1 = makeExpense({ date: '2026-12-01', categoryId: 'transport' });
const all = [oct31, nov1, nov30, dec1];

describe('filterExpenses', () => {
  it('returns everything when no filter is set', () => {
    expect(filterExpenses(all, {})).toEqual(all);
  });

  it('keeps only the selected month, boundaries included', () => {
    expect(filterExpenses(all, { month: '2026-11' })).toEqual([nov1, nov30]);
  });

  it('keeps only the selected category', () => {
    expect(filterExpenses(all, { categoryId: 'transport' })).toEqual([nov30, dec1]);
  });

  it('combines month and category', () => {
    expect(filterExpenses(all, { month: '2026-11', categoryId: 'transport' })).toEqual([nov30]);
  });

  it('returns an empty list for a month with no expenses', () => {
    expect(filterExpenses(all, { month: '2027-03' })).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [...all];
    filterExpenses(input, { month: '2026-11' });
    expect(input).toEqual(all);
  });
});
