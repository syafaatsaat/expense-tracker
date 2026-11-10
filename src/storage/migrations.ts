import { CURRENT_VERSION } from './schema.ts';

type Data = Record<string, unknown>;

/** Upgrades data from version `from` to `from + 1`. The runner sets the new version number. */
export interface Migration {
  from: number;
  migrate: (data: Data) => Data;
}

/**
 * Every shape change adds one entry here (and a test). Version 1 is the first stored
 * format, so the list starts empty.
 */
export const MIGRATIONS: readonly Migration[] = [];

export type MigrationError =
  'not-an-object' | 'invalid-version' | 'newer-version' | 'no-migration-path' | 'migration-failed';

export type MigrationResult =
  | { ok: true; data: Data; fromVersion: number }
  | { ok: false; error: MigrationError; version?: number; detail?: string };

/** Brings stored data up to `target`, one version at a time. Does not validate the result. */
export function runMigrations(
  data: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = CURRENT_VERSION,
): MigrationResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'not-an-object' };
  }
  const fromVersion = (data as Data).version;
  if (typeof fromVersion !== 'number' || !Number.isSafeInteger(fromVersion) || fromVersion < 0) {
    return { ok: false, error: 'invalid-version' };
  }
  if (fromVersion > target) return { ok: false, error: 'newer-version', version: fromVersion };

  let current = data as Data;
  for (let version = fromVersion; version < target; version += 1) {
    const step = migrations.find((m) => m.from === version);
    if (!step) return { ok: false, error: 'no-migration-path', version };
    try {
      current = { ...step.migrate(current), version: version + 1 };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: 'migration-failed', version, detail };
    }
  }
  return { ok: true, data: current, fromVersion };
}
