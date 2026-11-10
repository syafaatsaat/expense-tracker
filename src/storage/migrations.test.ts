import { MIGRATIONS, runMigrations, type Migration } from './migrations.ts';
import { CURRENT_VERSION } from './schema.ts';

const addField: Migration = { from: 1, migrate: (d) => ({ ...d, added: true }) };
const renameField: Migration = {
  from: 2,
  migrate: ({ added, ...rest }) => ({ ...rest, renamed: added }),
};

describe('runMigrations', () => {
  it('leaves data at the target version untouched', () => {
    const data = { version: 3, x: 1 };
    expect(runMigrations(data, [addField, renameField], 3)).toEqual({
      ok: true,
      data,
      fromVersion: 3,
    });
  });

  it('applies migrations in order and bumps the version each step', () => {
    const result = runMigrations({ version: 1, x: 1 }, [renameField, addField], 3);
    expect(result).toEqual({
      ok: true,
      data: { version: 3, x: 1, renamed: true },
      fromVersion: 1,
    });
  });

  it('can run part of the chain', () => {
    const result = runMigrations({ version: 2, added: 'yes' }, [addField, renameField], 3);
    expect(result).toEqual({ ok: true, data: { version: 3, renamed: 'yes' }, fromVersion: 2 });
  });

  it('does not mutate its input', () => {
    const data = { version: 1 };
    runMigrations(data, [addField], 2);
    expect(data).toEqual({ version: 1 });
  });

  it('refuses data from a newer app version', () => {
    expect(runMigrations({ version: 4 }, [addField], 3)).toMatchObject({
      ok: false,
      error: 'newer-version',
      version: 4,
    });
  });

  it.each([{}, { version: 'one' }, { version: -1 }, { version: 1.5 }])(
    'rejects an invalid version: %j',
    (data) => {
      expect(runMigrations(data, [], 1)).toMatchObject({ ok: false, error: 'invalid-version' });
    },
  );

  it.each([null, [], 'text', 42])('rejects non-object data: %j', (data) => {
    expect(runMigrations(data, [], 1)).toMatchObject({ ok: false, error: 'not-an-object' });
  });

  it('reports a gap in the chain', () => {
    expect(runMigrations({ version: 1 }, [renameField], 3)).toMatchObject({
      ok: false,
      error: 'no-migration-path',
      version: 1,
    });
  });

  it('reports a migration that throws', () => {
    const broken: Migration = {
      from: 1,
      migrate: () => {
        throw new Error('boom');
      },
    };
    expect(runMigrations({ version: 1 }, [broken], 2)).toMatchObject({
      ok: false,
      error: 'migration-failed',
      version: 1,
      detail: 'boom',
    });
  });

  it('has a complete chain up to the current version', () => {
    // Every version from 1 to CURRENT_VERSION - 1 needs a migration.
    for (let v = 1; v < CURRENT_VERSION; v += 1) {
      expect(MIGRATIONS.some((m) => m.from === v)).toBe(true);
    }
    expect(runMigrations({ version: 1 }).ok).toBe(true);
  });
});
