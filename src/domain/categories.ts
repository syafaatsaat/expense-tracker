import type { Category, CategoryId } from './types.ts';

/**
 * The fixed category list, in display order. Colours are Tailwind 600/700 (light theme)
 * and 400 (dark theme). Colour is never the only identifier: always show the name or icon.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'housing',
    name: 'Housing & property',
    code: 'HS',
    shortName: 'HOUSING',
    kind: 'spending',
    icon: 'house',
    colour: { light: '#4f46e5', dark: '#818cf8' },
  },
  {
    id: 'utilities',
    name: 'Utilities',
    code: 'UT',
    shortName: 'UTILITY',
    kind: 'spending',
    icon: 'bolt',
    colour: { light: '#0891b2', dark: '#22d3ee' },
  },
  {
    id: 'food',
    name: 'Food & dining',
    code: 'FD',
    shortName: 'FOOD',
    kind: 'spending',
    icon: 'bowl',
    colour: { light: '#ea580c', dark: '#fb923c' },
  },
  {
    id: 'transport',
    name: 'Transportation',
    code: 'TR',
    shortName: 'TRANSPORT',
    kind: 'spending',
    icon: 'bus',
    colour: { light: '#2563eb', dark: '#60a5fa' },
  },
  {
    id: 'healthcare',
    name: 'Healthcare & medical',
    code: 'HC',
    shortName: 'HEALTH',
    kind: 'spending',
    icon: 'cross',
    colour: { light: '#dc2626', dark: '#f87171' },
  },
  {
    id: 'savings',
    name: 'Savings & investments',
    code: 'SV',
    shortName: 'SAVINGS',
    kind: 'saving',
    icon: 'coins',
    colour: { light: '#059669', dark: '#34d399' },
  },
  {
    id: 'personal-care',
    name: 'Personal care & lifestyle',
    code: 'PC',
    shortName: 'CARE',
    kind: 'spending',
    icon: 'scissors',
    colour: { light: '#db2777', dark: '#f472b6' },
  },
  {
    id: 'insurance',
    name: 'Insurance & protection',
    code: 'IN',
    shortName: 'INSURE',
    kind: 'spending',
    icon: 'shield',
    colour: { light: '#4d7c0f', dark: '#a3e635' },
  },
  {
    id: 'debts',
    name: 'Debts & loans',
    code: 'DL',
    shortName: 'DEBTS',
    kind: 'spending',
    icon: 'card',
    colour: { light: '#d97706', dark: '#fbbf24' },
  },
  {
    id: 'entertainment',
    name: 'Entertainment & leisure',
    code: 'EN',
    shortName: 'LEISURE',
    kind: 'spending',
    icon: 'star',
    colour: { light: '#7c3aed', dark: '#a78bfa' },
  },
  {
    id: 'other',
    name: 'Other',
    code: 'OT',
    shortName: 'OTHER',
    kind: 'spending',
    icon: 'dots',
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
