/**
 * A calendar date as the user picked it, in local time: `YYYY-MM-DD`.
 * Never a UTC timestamp. The template-literal type stops a full ISO string or a Date
 * from being passed by mistake; use `isLocalDate` to check untrusted input.
 */
export type LocalDate = `${number}-${number}-${number}`;

/** A month, `YYYY-MM`. For a LocalDate it is the first 7 characters. */
export type MonthKey = `${number}-${number}`;

export const CATEGORY_IDS = [
  'housing',
  'utilities',
  'food',
  'transport',
  'healthcare',
  'savings',
  'personal-care',
  'insurance',
  'debts',
  'entertainment',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** `saving` categories are left out of spending totals, breakdowns and budgets. */
export type CategoryKind = 'spending' | 'saving';

/** Icon names; the UI maps each one to an inline SVG. */
export type CategoryIcon =
  | 'home'
  | 'bolt'
  | 'utensils'
  | 'car'
  | 'heart-pulse'
  | 'piggy-bank'
  | 'sparkles'
  | 'shield'
  | 'credit-card'
  | 'film'
  | 'tag';

export interface Category {
  id: CategoryId;
  name: string;
  kind: CategoryKind;
  /** Swatch colours only, never text colours. Light theme on white, dark on slate-900. */
  colour: { light: string; dark: string };
  icon: CategoryIcon;
}

export interface Expense {
  id: string;
  /** Always an integer. */
  amountCents: number;
  date: LocalDate;
  categoryId: CategoryId;
  note?: string;
  recurringId?: string;
  /** ISO timestamp, used only to order expenses that share a date. */
  createdAt: string;
}

export interface RecurringTemplate {
  id: string;
  amountCents: number;
  categoryId: CategoryId;
  note?: string;
  startDate: LocalDate;
  /** 1 to 31. Clamped to the last day in shorter months. */
  dayOfMonth: number;
  endDate?: LocalDate;
  lastGeneratedDate?: LocalDate;
  active: boolean;
}

export interface Budget {
  categoryId: CategoryId;
  monthlyLimitCents: number;
}

export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  theme: Theme;
  lastCategoryId?: CategoryId;
  seeded: boolean;
}
