import { createSeedData } from '../domain/seed.ts';
import type { Expense, LocalDate, Settings } from '../domain/types.ts';
import { StorageError, type StorageBackend } from './backend.ts';
import { MIGRATIONS, runMigrations, type Migration } from './migrations.ts';
import {
  CURRENT_VERSION,
  validateExpense,
  validateRoot,
  validateSettings,
  type StorageRoot,
} from './schema.ts';

export const STORAGE_KEY = 'expense-tracker';
/** Where corrupt data is copied before a reset or import replaces it. */
export const BACKUP_KEY = 'expense-tracker:backup';

/** What the add and edit forms provide. id, createdAt and recurringId are not editable. */
export type ExpenseInput = Pick<Expense, 'amountCents' | 'date' | 'categoryId' | 'note'>;

export type CorruptReason = 'invalid-json' | 'invalid-data' | 'newer-version' | 'migration-failed';

export type LoadResult =
  | {
      status: 'ready';
      root: StorageRoot;
      /** True when demo data was created on this load (first visit). */
      seeded: boolean;
      /** False when storage is unusable: the app works, but changes last only this session. */
      persistent: boolean;
    }
  | {
      status: 'corrupt';
      reason: CorruptReason;
      detail: string;
      /** The stored text, untouched, so the UI can offer to download it. */
      raw: string;
    };

export type WriteError =
  'storage-full' | 'storage-unavailable' | 'not-ready' | 'not-found' | 'duplicate-id' | 'invalid';

export type WriteResult<T> =
  { ok: true; value: T } | { ok: false; error: WriteError; detail?: string };

/**
 * All persistence goes through this interface. Data is read once by `load` and kept in
 * memory. Each change writes the whole root, and is applied in memory only after the
 * write succeeds, so memory and storage never disagree.
 */
export interface Repository {
  load(today: LocalDate): Promise<LoadResult>;
  listExpenses(): Promise<Expense[]>;
  addExpense(input: ExpenseInput): Promise<WriteResult<Expense>>;
  updateExpense(id: string, input: ExpenseInput): Promise<WriteResult<Expense>>;
  /** Returns the removed expense so the UI can offer undo. */
  removeExpense(id: string): Promise<WriteResult<Expense>>;
  /** Puts a removed expense back unchanged (undo). */
  restoreExpense(expense: Expense): Promise<WriteResult<Expense>>;
  updateSettings(patch: Partial<Settings>): Promise<WriteResult<Settings>>;
  /** Replaces everything with fresh demo data. Corrupt data is backed up first. */
  reset(today: LocalDate): Promise<WriteResult<StorageRoot>>;
  /** Replaces everything with imported data, after migrating and validating it. */
  replace(data: unknown): Promise<WriteResult<StorageRoot>>;
}

export interface RepositoryOptions {
  backend: StorageBackend;
  newId?: () => string;
  /** Clock for `createdAt` timestamps. Injected so tests are deterministic. */
  now?: () => string;
  migrations?: readonly Migration[];
}

type State =
  | { kind: 'unloaded' }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'ready'; root: StorageRoot; persistent: boolean };

function writeError(error: unknown): WriteError {
  return error instanceof StorageError && error.kind === 'full'
    ? 'storage-full'
    : 'storage-unavailable';
}

export function createRepository({
  backend,
  newId = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
  migrations = MIGRATIONS,
}: RepositoryOptions): Repository {
  let state: State = { kind: 'unloaded' };

  function seedRoot(today: LocalDate): StorageRoot {
    return {
      version: CURRENT_VERSION,
      ...createSeedData(today, newId),
      budgets: [],
      settings: { theme: 'system', seeded: true },
    };
  }

  /** Writes `next` and, only if that worked, makes it the current state. */
  async function commit<T>(next: StorageRoot, value: T): Promise<WriteResult<T>> {
    const persistent = state.kind === 'ready' ? state.persistent : true;
    if (persistent) {
      try {
        await backend.write(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        return { ok: false, error: writeError(error) };
      }
    }
    state = { kind: 'ready', root: next, persistent };
    return { ok: true, value };
  }

  /** Runs `change` against the loaded root, or refuses if nothing valid is loaded. */
  function withRoot<T>(
    change: (root: StorageRoot) => Promise<WriteResult<T>>,
  ): Promise<WriteResult<T>> {
    if (state.kind !== 'ready') return Promise.resolve({ ok: false, error: 'not-ready' });
    return change(state.root);
  }

  /** Replaces all data. Corrupt data is copied to BACKUP_KEY first and kept if that fails. */
  async function overwrite(next: StorageRoot): Promise<WriteResult<StorageRoot>> {
    if (state.kind === 'corrupt') {
      try {
        await backend.write(BACKUP_KEY, state.raw);
      } catch (error) {
        return { ok: false, error: writeError(error) };
      }
    }
    return commit(next, next);
  }

  function invalid(path: string, reason: string): WriteResult<never> {
    return { ok: false, error: 'invalid', detail: path ? `${path}: ${reason}` : reason };
  }

  return {
    async load(today) {
      let raw: string | null;
      try {
        raw = await backend.read(STORAGE_KEY);
      } catch {
        // Storage is blocked: run on demo data in memory for this session.
        const root = seedRoot(today);
        state = { kind: 'ready', root, persistent: false };
        return { status: 'ready', root, seeded: true, persistent: false };
      }

      if (raw === null) {
        // First visit. A failed save is not fatal: carry on in memory.
        const root = seedRoot(today);
        const saved = await commit(root, root);
        if (!saved.ok) state = { kind: 'ready', root, persistent: false };
        return { status: 'ready', root, seeded: true, persistent: saved.ok };
      }

      const corrupt = (reason: CorruptReason, detail: string): LoadResult => {
        state = { kind: 'corrupt', raw };
        return { status: 'corrupt', reason, detail, raw };
      };

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        return corrupt('invalid-json', error instanceof Error ? error.message : 'Unparseable data');
      }

      const migrated = runMigrations(parsed, migrations);
      if (!migrated.ok) {
        if (migrated.error === 'newer-version') {
          return corrupt('newer-version', `Saved by a newer version (${migrated.version})`);
        }
        if (migrated.error === 'migration-failed') {
          return corrupt('migration-failed', migrated.detail ?? `From version ${migrated.version}`);
        }
        return corrupt('invalid-data', migrated.error);
      }

      const valid = validateRoot(migrated.data);
      if (!valid.ok) return corrupt('invalid-data', `${valid.path}: ${valid.reason}`);

      const root = valid.value;
      state = { kind: 'ready', root, persistent: true };
      if (migrated.fromVersion !== CURRENT_VERSION) {
        // Save the upgrade. If it fails, the next change retries it.
        await commit(root, root);
      }
      return { status: 'ready', root, seeded: false, persistent: true };
    },

    listExpenses() {
      return Promise.resolve(state.kind === 'ready' ? [...state.root.expenses] : []);
    },

    addExpense(input) {
      return withRoot((root) => {
        const checked = validateExpense({ ...input, id: newId(), createdAt: now() });
        if (!checked.ok) return Promise.resolve(invalid(checked.path, checked.reason));
        return commit({ ...root, expenses: [...root.expenses, checked.value] }, checked.value);
      });
    },

    updateExpense(id, input) {
      return withRoot((root) => {
        const existing = root.expenses.find((e) => e.id === id);
        if (!existing) return Promise.resolve({ ok: false, error: 'not-found' });
        const { recurringId, createdAt } = existing;
        const checked = validateExpense({ ...input, id, createdAt, recurringId });
        if (!checked.ok) return Promise.resolve(invalid(checked.path, checked.reason));
        const expenses = root.expenses.map((e) => (e.id === id ? checked.value : e));
        return commit({ ...root, expenses }, checked.value);
      });
    },

    removeExpense(id) {
      return withRoot((root) => {
        const existing = root.expenses.find((e) => e.id === id);
        if (!existing) return Promise.resolve({ ok: false, error: 'not-found' });
        return commit({ ...root, expenses: root.expenses.filter((e) => e.id !== id) }, existing);
      });
    },

    restoreExpense(expense) {
      return withRoot((root) => {
        if (root.expenses.some((e) => e.id === expense.id)) {
          return Promise.resolve({ ok: false, error: 'duplicate-id' });
        }
        const checked = validateExpense(expense);
        if (!checked.ok) return Promise.resolve(invalid(checked.path, checked.reason));
        return commit({ ...root, expenses: [...root.expenses, checked.value] }, checked.value);
      });
    },

    updateSettings(patch) {
      return withRoot((root) => {
        const checked = validateSettings({ ...root.settings, ...patch });
        if (!checked.ok) return Promise.resolve(invalid(checked.path, checked.reason));
        return commit({ ...root, settings: checked.value }, checked.value);
      });
    },

    reset(today) {
      return overwrite(seedRoot(today));
    },

    replace(data) {
      const migrated = runMigrations(data, migrations);
      if (!migrated.ok) return Promise.resolve(invalid('', migrated.error));
      const valid = validateRoot(migrated.data);
      if (!valid.ok) return Promise.resolve(invalid(valid.path, valid.reason));
      return overwrite(valid.value);
    },
  };
}
