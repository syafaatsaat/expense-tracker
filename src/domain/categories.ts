import type { Category, CategoryId } from './types.ts';

/**
 * The fixed category list, in display order. Colours are Tailwind 600/700 (light theme)
 * and 400 (dark theme). Colour is never the only identifier: always show the name or icon.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'housing',
    name: 'Housing & property',
    kind: 'spending',
    icon: 'home',
    colour: { light: '#4f46e5', dark: '#818cf8' },
  },
  {
    id: 'utilities',
    name: 'Utilities',
    kind: 'spending',
    icon: 'bolt',
    colour: { light: '#0891b2', dark: '#22d3ee' },
  },
  {
    id: 'food',
    name: 'Food & dining',
    kind: 'spending',
    icon: 'utensils',
    colour: { light: '#ea580c', dark: '#fb923c' },
  },
  {
    id: 'transport',
    name: 'Transportation',
    kind: 'spending',
    icon: 'car',
    colour: { light: '#2563eb', dark: '#60a5fa' },
  },
  {
    id: 'healthcare',
    name: 'Healthcare & medical',
    kind: 'spending',
    icon: 'heart-pulse',
    colour: { light: '#dc2626', dark: '#f87171' },
  },
  {
    id: 'savings',
    name: 'Savings & investments',
    kind: 'saving',
    icon: 'piggy-bank',
    colour: { light: '#059669', dark: '#34d399' },
  },
  {
    id: 'personal-care',
    name: 'Personal care & lifestyle',
    kind: 'spending',
    icon: 'sparkles',
    colour: { light: '#db2777', dark: '#f472b6' },
  },
  {
    id: 'insurance',
    name: 'Insurance & protection',
    kind: 'spending',
    icon: 'shield',
    colour: { light: '#4d7c0f', dark: '#a3e635' },
  },
  {
    id: 'debts',
    name: 'Debts & loans',
    kind: 'spending',
    icon: 'credit-card',
    colour: { light: '#d97706', dark: '#fbbf24' },
  },
  {
    id: 'entertainment',
    name: 'Entertainment & leisure',
    kind: 'spending',
    icon: 'film',
    colour: { light: '#7c3aed', dark: '#a78bfa' },
  },
  {
    id: 'other',
    name: 'Other',
    kind: 'spending',
    icon: 'tag',
    colour: { light: '#475569', dark: '#94a3b8' },
  },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

export function getCategory(id: CategoryId): Category {
  const category = BY_ID.get(id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

/** Position in the fixed display order; used to break ties deterministically. */
export function categoryOrder(id: CategoryId): number {
  return ORDER.get(id) ?? Number.MAX_SAFE_INTEGER;
}

export function isSpendingCategory(id: CategoryId): boolean {
  return getCategory(id).kind === 'spending';
}
