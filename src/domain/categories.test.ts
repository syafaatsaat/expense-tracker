import { CATEGORIES, KEY_ORDER, getCategory, isSpendingCategory } from './categories.ts';
import { PIXEL_BITMAPS } from '../ui/pixelBitmaps.ts';
import { CATEGORY_IDS } from './types.ts';

// WCAG 2.x relative luminance and contrast ratio, for checking the palette.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const SLATE_900 = '#0f172a';

describe('CATEGORIES', () => {
  it('has the 11 categories from the spec, in order, with Other last', () => {
    expect(CATEGORIES.map((c) => c.name)).toEqual([
      'Housing & property',
      'Utilities',
      'Food & dining',
      'Transportation',
      'Healthcare & medical',
      'Savings & investments',
      'Personal care & lifestyle',
      'Insurance & protection',
      'Debts & loans',
      'Entertainment & leisure',
      'Other',
    ]);
  });

  it('matches CATEGORY_IDS one to one', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_IDS]);
  });

  it('gives every category a 9x9 pixel icon that exists', () => {
    for (const c of CATEGORIES) {
      const bitmap: readonly string[] = PIXEL_BITMAPS[c.icon];
      expect(bitmap).toHaveLength(9);
      for (const row of bitmap) expect(row).toHaveLength(9);
    }
  });

  it('gives every category a unique two-letter code and a short key name', () => {
    expect(CATEGORIES.map((c) => c.code)).toEqual([
      'HS',
      'UT',
      'FD',
      'TR',
      'HC',
      'SV',
      'PC',
      'IN',
      'DL',
      'EN',
      'OT',
    ]);
    expect(CATEGORIES.map((c) => c.shortName)).toEqual([
      'HOUSING',
      'UTILITY',
      'FOOD',
      'TRANSPORT',
      'HEALTH',
      'SAVINGS',
      'CARE',
      'INSURE',
      'DEBTS',
      'LEISURE',
      'OTHER',
    ]);
  });

  it('gives every category a different icon', () => {
    expect(new Set(CATEGORIES.map((c) => c.icon)).size).toBe(CATEGORIES.length);
  });

  it.each(CATEGORIES.map((c) => [c.name, c] as const))(
    '%s swatches pass 3:1 non-text contrast in both themes',
    (_name, c) => {
      expect(c.colour.light).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.colour.dark).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(c.colour.light, WHITE)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.colour.dark, SLATE_900)).toBeGreaterThanOrEqual(3);
    },
  );

  it('uses the spec palette values', () => {
    expect(getCategory('housing').colour).toEqual({ light: '#4f46e5', dark: '#818cf8' });
    expect(getCategory('savings').colour).toEqual({ light: '#059669', dark: '#34d399' });
    expect(getCategory('other').colour).toEqual({ light: '#475569', dark: '#94a3b8' });
  });
});

describe('isSpendingCategory', () => {
  it('excludes only Savings & investments', () => {
    const nonSpending = CATEGORY_IDS.filter((id) => !isSpendingCategory(id));
    expect(nonSpending).toEqual(['savings']);
  });

  it('counts Debts & loans as spending', () => {
    expect(isSpendingCategory('debts')).toBe(true);
  });
});

describe('KEY_ORDER', () => {
  it('lists every department once, as on the keys: spending first, savings last', () => {
    expect([...KEY_ORDER].sort()).toEqual([...CATEGORY_IDS].sort());
    expect(KEY_ORDER.map((id) => getCategory(id).code)).toEqual([
      'HS',
      'UT',
      'FD',
      'TR',
      'HC',
      'PC',
      'IN',
      'DL',
      'EN',
      'OT',
      'SV',
    ]);
  });
});
