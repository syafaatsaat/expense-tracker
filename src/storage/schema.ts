import { isSpendingCategory } from '../domain/categories.ts';
import {
  CATEGORY_IDS,
  type Budget,
  type CategoryId,
  type Expense,
  type LocalDate,
  type RecurringTemplate,
  type Settings,
  type Theme,
} from '../domain/types.ts';
import { isLocalDate } from '../lib/dates.ts';
import { MAX_AMOUNT_CENTS } from '../lib/money.ts';

/** Bump this with every shape change, and add a migration from the previous version. */
export const CURRENT_VERSION = 1;

/** Everything the app stores, under one key. */
export interface StorageRoot {
  version: typeof CURRENT_VERSION;
  expenses: Expense[];
  recurring: RecurringTemplate[];
  budgets: Budget[];
  settings: Settings;
}

export function createEmptyRoot(): StorageRoot {
  return {
    version: CURRENT_VERSION,
    expenses: [],
    recurring: [],
    budgets: [],
    settings: { theme: 'system', seeded: false },
  };
}

export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; path: string; reason: string };

// Hand-written validation: no schema library, so no runtime dependency. Each validator
// builds a fresh object from known fields only, so unknown fields are dropped.

class Invalid extends Error {
  constructor(
    readonly path: string,
    readonly reason: string,
  ) {
    super(`${path}: ${reason}`);
  }
}

type Fields = Record<string, unknown>;
const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

const join = (base: string, key: string) => (base ? `${base}.${key}` : key);

function object(value: unknown, path: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Invalid(path || '(root)', 'expected an object');
  }
  return value as Fields;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Invalid(path, 'expected an array');
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value === '')
    throw new Invalid(path, 'expected a non-empty string');
  return value;
}

function optionalText(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Invalid(path, 'expected a string');
  return value;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Invalid(path, 'expected true or false');
  return value;
}

function cents(value: unknown, path: string): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) <= 0 ||
    (value as number) > MAX_AMOUNT_CENTS
  ) {
    throw new Invalid(path, `expected whole cents from 1 to ${MAX_AMOUNT_CENTS}`);
  }
  return value as number;
}

function date(value: unknown, path: string): LocalDate {
  if (typeof value !== 'string' || !isLocalDate(value))
    throw new Invalid(path, 'expected a YYYY-MM-DD date');
  return value;
}

function optionalDate(value: unknown, path: string): LocalDate | undefined {
  return value === undefined ? undefined : date(value, path);
}

function category(value: unknown, path: string): CategoryId {
  if (!CATEGORY_IDS.includes(value as CategoryId)) throw new Invalid(path, 'unknown category');
  return value as CategoryId;
}

/** Copies only the keys whose value is defined, so optional fields stay absent. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function unique<T>(items: T[], key: (item: T) => string, path: string, field: string): T[] {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const k = key(item);
    if (seen.has(k)) throw new Invalid(`${path}[${i}].${field}`, `duplicate ${field}`);
    seen.add(k);
  });
  return items;
}

function expense(value: unknown, path: string): Expense {
  const f = object(value, path);
  return compact({
    id: text(f.id, join(path, 'id')),
    amountCents: cents(f.amountCents, join(path, 'amountCents')),
    date: date(f.date, join(path, 'date')),
    categoryId: category(f.categoryId, join(path, 'categoryId')),
    note: optionalText(f.note, join(path, 'note')),
    recurringId: optionalText(f.recurringId, join(path, 'recurringId')),
    createdAt: text(f.createdAt, join(path, 'createdAt')),
  });
}

function template(value: unknown, path: string): RecurringTemplate {
  const f = object(value, path);
  const startDate = date(f.startDate, join(path, 'startDate'));
  const endDate = optionalDate(f.endDate, join(path, 'endDate'));
  if (endDate !== undefined && endDate < startDate) {
    throw new Invalid(join(path, 'endDate'), 'is before startDate');
  }
  const day = f.dayOfMonth;
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) {
    throw new Invalid(join(path, 'dayOfMonth'), 'expected a whole number from 1 to 31');
  }
  return compact({
    id: text(f.id, join(path, 'id')),
    amountCents: cents(f.amountCents, join(path, 'amountCents')),
    categoryId: category(f.categoryId, join(path, 'categoryId')),
    note: optionalText(f.note, join(path, 'note')),
    startDate,
    dayOfMonth: day as number,
    endDate,
    lastGeneratedDate: optionalDate(f.lastGeneratedDate, join(path, 'lastGeneratedDate')),
    active: bool(f.active, join(path, 'active')),
  });
}

function budget(value: unknown, path: string): Budget {
  const f = object(value, path);
  const categoryId = category(f.categoryId, join(path, 'categoryId'));
  if (!isSpendingCategory(categoryId)) {
    throw new Invalid(join(path, 'categoryId'), 'savings categories have no budget');
  }
  return {
    categoryId,
    monthlyLimitCents: cents(f.monthlyLimitCents, join(path, 'monthlyLimitCents')),
  };
}

function settings(value: unknown, path: string): Settings {
  const f = object(value, path);
  if (!THEMES.includes(f.theme as Theme)) {
    throw new Invalid(join(path, 'theme'), `expected one of ${THEMES.join(', ')}`);
  }
  return compact({
    theme: f.theme as Theme,
    lastCategoryId:
      f.lastCategoryId === undefined
        ? undefined
        : category(f.lastCategoryId, join(path, 'lastCategoryId')),
    seeded: bool(f.seeded, join(path, 'seeded')),
  });
}

function list<T>(value: unknown, path: string, item: (v: unknown, p: string) => T): T[] {
  return array(value, path).map((v, i) => item(v, `${path}[${i}]`));
}

function run<T>(check: () => T): ValidationResult<T> {
  try {
    return { ok: true, value: check() };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, path: error.path, reason: error.reason };
    throw error;
  }
}

/** Checks untrusted data (from storage or an import) against the current schema. */
export function validateRoot(value: unknown): ValidationResult<StorageRoot> {
  return run(() => {
    const f = object(value, '');
    if (f.version !== CURRENT_VERSION) throw new Invalid('version', `expected ${CURRENT_VERSION}`);
    return {
      version: CURRENT_VERSION,
      expenses: unique(list(f.expenses, 'expenses', expense), (e) => e.id, 'expenses', 'id'),
      recurring: unique(list(f.recurring, 'recurring', template), (t) => t.id, 'recurring', 'id'),
      budgets: unique(
        list(f.budgets, 'budgets', budget),
        (b) => b.categoryId,
        'budgets',
        'categoryId',
      ),
      settings: settings(f.settings, 'settings'),
    };
  });
}

export function validateExpense(value: unknown): ValidationResult<Expense> {
  return run(() => expense(value, ''));
}

export function validateSettings(value: unknown): ValidationResult<Settings> {
  return run(() => settings(value, ''));
}
