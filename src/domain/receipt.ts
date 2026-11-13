import { getCategory } from './categories.ts';
import type { Expense, LocalDate } from './types.ts';

export interface DayGroup {
  date: LocalDate;
  lines: Expense[];
}

/** Receipt order: newest date first; same-day lines newest-created first, then by id. */
export function sortForReceipt(expenses: readonly Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
}

/** Groups sorted lines into days, keeping their order. */
export function groupByDay(sorted: readonly Expense[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const expense of sorted) {
    const last = groups.at(-1);
    if (last?.date === expense.date) last.lines.push(expense);
    else groups.push({ date: expense.date, lines: [expense] });
  }
  return groups;
}

/**
 * The days to print before the "show more" marker: whole days only, up to `limit` lines,
 * but always at least the first day so the receipt never prints empty.
 */
export function previewGroups(
  groups: readonly DayGroup[],
  limit: number,
): { visible: DayGroup[]; hiddenCount: number } {
  const visible: DayGroup[] = [];
  let shown = 0;
  for (const group of groups) {
    if (visible.length > 0 && shown + group.lines.length > limit) break;
    visible.push(group);
    shown += group.lines.length;
  }
  const total = groups.reduce((sum, g) => sum + g.lines.length, 0);
  return { visible, hiddenCount: total - shown };
}

/** The printed description: the note, or the department name when the note is empty. */
export function lineDescription(expense: Expense): string {
  return expense.note?.trim() || getCategory(expense.categoryId).name;
}
