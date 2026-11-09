import { categoryOrder, isSpendingCategory } from './categories.ts';
import type { CategoryId, Expense } from './types.ts';

export interface CategoryTotal {
  categoryId: CategoryId;
  amountCents: number;
  /** Share of spending in tenths of a percent (0 to 1000). Shares sum to exactly 1000. */
  permille: number;
}

export interface Summary {
  /** Total of spending categories. Excludes Savings & investments. */
  spentCents: number;
  /** Total of saving categories, shown as the separate "Saved" figure. */
  savedCents: number;
  /** Spending categories with at least one expense, largest first. */
  breakdown: CategoryTotal[];
}

/**
 * Splits `scale` integer units across non-negative integer weights in proportion, using the
 * largest-remainder method so the parts always sum to exactly `scale` (or are all 0 when the
 * weights are). Remainder ties go to the earlier weight.
 */
export function apportion(weights: readonly number[], scale: number): number[] {
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) throw new RangeError(`Invalid weight: ${w}`);
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) return weights.map(() => 0);

  // Integer maths: quotient and remainder of w * scale / total, so there is no float drift.
  const parts = weights.map((w) => Math.floor((w * scale) / total));
  const remainders = weights.map((w, i) => ({ i, r: (w * scale) % total }));
  let left = scale - parts.reduce((sum, p) => sum + p, 0);

  remainders.sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of remainders) {
    if (left === 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}

/** Totals and per-category breakdown for a list of expenses (filter first). */
export function summarize(expenses: readonly Expense[]): Summary {
  let spentCents = 0;
  let savedCents = 0;
  const byCategory = new Map<CategoryId, number>();

  for (const { amountCents, categoryId } of expenses) {
    if (!Number.isSafeInteger(amountCents)) {
      throw new RangeError(`Expected integer cents, got ${amountCents}`);
    }
    if (isSpendingCategory(categoryId)) {
      spentCents += amountCents;
      byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + amountCents);
    } else {
      savedCents += amountCents;
    }
  }

  const rows = [...byCategory]
    .map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents || categoryOrder(a.categoryId) - categoryOrder(b.categoryId),
    );
  const shares = apportion(
    rows.map((r) => r.amountCents),
    1000,
  );

  return {
    spentCents,
    savedCents,
    breakdown: rows.map((r, i) => ({ ...r, permille: shares[i] ?? 0 })),
  };
}
