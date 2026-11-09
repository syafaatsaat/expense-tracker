import { isInMonth } from '../lib/dates.ts';
import type { CategoryId, Expense, MonthKey } from './types.ts';

export interface ExpenseFilter {
  /** Omit for all months. */
  month?: MonthKey;
  /** Omit for all categories. */
  categoryId?: CategoryId;
}

/** Keeps expenses that match every filter that is set. Returns a new array. */
export function filterExpenses(expenses: readonly Expense[], filter: ExpenseFilter): Expense[] {
  const { month, categoryId } = filter;
  return expenses.filter(
    (e) =>
      (month === undefined || isInMonth(e.date, month)) &&
      (categoryId === undefined || e.categoryId === categoryId),
  );
}
