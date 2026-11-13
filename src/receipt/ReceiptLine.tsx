import { getCategory } from '../domain/categories.ts';
import { lineDescription } from '../domain/receipt.ts';
import type { Expense } from '../domain/types.ts';
import { formatAmount, formatCents } from '../lib/money.ts';
import { PixelIcon } from '../ui/PixelIcon.tsx';

/**
 * One printed line: department icon, description, dot leader, amount. Screen readers get
 * the department name and the full amount, so the icon is never the only identifier.
 */
export function ReceiptLine({ expense }: { expense: Expense }) {
  const category = getCategory(expense.categoryId);
  return (
    <li className="-mx-1.5 flex min-h-7 items-center gap-2 px-1.5 text-line">
      <PixelIcon name={category.icon} className="shrink-0 text-muted" />
      <span className="min-w-0 truncate uppercase">{lineDescription(expense)}</span>
      <span className="sr-only">{category.name}</span>
      <span aria-hidden="true" className="leader mb-1.5 min-w-3 flex-1 self-end" />
      <span aria-hidden="true" className="shrink-0">
        {formatAmount(expense.amountCents)}
      </span>
      <span className="sr-only">{formatCents(expense.amountCents)}</span>
    </li>
  );
}
