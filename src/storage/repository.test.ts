import { MemoryBackend } from '../test/memoryBackend.ts';
import { makeExpense, makeRoot } from '../test/factories.ts';
import type { Migration } from './migrations.ts';
import { BACKUP_KEY, createRepository, STORAGE_KEY, type RepositoryOptions } from './repository.ts';
import type { StorageRoot } from './schema.ts';

const TODAY = '2026-11-10';
const NOW = '2026-11-10T04:00:00.000Z';

function open(backend: MemoryBackend, options: Partial<RepositoryOptions> = {}) {
  let n = 0;
  return createRepository({ backend, newId: () => `id-${++n}`, now: () => NOW, ...options });
}

function withStored(value: unknown): MemoryBackend {
  const backend = new MemoryBackend();
  backend.data.set(STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
  return backend;
}

function stored(backend: MemoryBackend): StorageRoot {
  return JSON.parse(backend.data.get(STORAGE_KEY) ?? 'null') as StorageRoot;
}

async function loadReady(backend: MemoryBackend, options: Partial<RepositoryOptions> = {}) {
  const repo = open(backend, options);
  const result = await repo.load(TODAY);
  if (result.status !== 'ready') throw new Error(`expected ready, got ${result.status}`);
  return { repo, result };
}

const lunch = { amountCents: 650, date: '2026-11-09', categoryId: 'food', note: 'Lunch' } as const;

describe('first visit', () => {
  it('seeds demo data once and saves it', async () => {
    const backend = new MemoryBackend();
    const { result } = await loadReady(backend);
    expect(result.seeded).toBe(true);
    expect(result.persistent).toBe(true);
    expect(result.root.expenses.length).toBeGreaterThan(0);
    expect(result.root.recurring).toHaveLength(3);
    expect(result.root.settings.seeded).toBe(true);
    expect(stored(backend)).toEqual(result.root);
  });

  it('does not re-seed on the next load, and does not write on a plain load', async () => {
    const backend = new MemoryBackend();
    const first = await loadReady(backend);
    const writes = backend.writes;
    const second = await loadReady(backend);
    expect(second.result.seeded).toBe(false);
    expect(second.result.root).toEqual(first.result.root);
    expect(backend.writes).toBe(writes);
  });

  it('does not re-seed after every expense was deleted', async () => {
    const backend = withStored(makeRoot({ expenses: [] }));
    const { result } = await loadReady(backend);
    expect(result.seeded).toBe(false);
    expect(result.root.expenses).toEqual([]);
  });
});

describe('expenses', () => {
  it('adds an expense with a new id and createdAt, and persists it', async () => {
    const backend = withStored(makeRoot({ expenses: [] }));
    const { repo } = await loadReady(backend);
    const result = await repo.addExpense(lunch);
    expect(result).toEqual({ ok: true, value: { ...lunch, id: 'id-1', createdAt: NOW } });
    const reopened = await loadReady(backend);
    expect(reopened.result.root.expenses).toEqual([{ ...lunch, id: 'id-1', createdAt: NOW }]);
  });

  it('rejects an invalid expense and writes nothing', async () => {
    const backend = withStored(makeRoot());
    const { repo } = await loadReady(backend);
    const result = await repo.addExpense({ ...lunch, amountCents: 0 });
    expect(result).toMatchObject({ ok: false, error: 'invalid' });
    expect(backend.writes).toBe(0);
  });

  it('updates an expense but keeps its id, createdAt and recurringId', async () => {
    const original = makeExpense({ id: 'e1', recurringId: 'tpl-9', note: 'Old' });
    const backend = withStored(makeRoot({ expenses: [original] }));
    const { repo } = await loadReady(backend);
    const result = await repo.updateExpense('e1', {
      amountCents: 999,
      date: '2026-11-08',
      categoryId: 'other',
    });
    const expected = {
      id: 'e1',
      createdAt: original.createdAt,
      recurringId: 'tpl-9',
      amountCents: 999,
      date: '2026-11-08',
      categoryId: 'other',
    };
    expect(result).toEqual({ ok: true, value: expected });
    expect(stored(backend).expenses).toEqual([expected]);
  });

  it('reports not-found when updating or removing an unknown id', async () => {
    const { repo } = await loadReady(withStored(makeRoot()));
    expect(await repo.updateExpense('nope', lunch)).toEqual({ ok: false, error: 'not-found' });
    expect(await repo.removeExpense('nope')).toEqual({ ok: false, error: 'not-found' });
  });

  it('removes an expense and restores it in place for undo', async () => {
    const a = makeExpense({ id: 'a' });
    const b = makeExpense({ id: 'b' });
    const backend = withStored(makeRoot({ expenses: [a, b] }));
    const { repo } = await loadReady(backend);

    expect(await repo.removeExpense('a')).toEqual({ ok: true, value: a });
    expect(await repo.listExpenses()).toEqual([b]);
    expect(stored(backend).expenses).toEqual([b]);

    expect(await repo.restoreExpense(a)).toEqual({ ok: true, value: a });
    expect(await repo.listExpenses()).toEqual([b, a]);
    expect(await repo.restoreExpense(a)).toEqual({ ok: false, error: 'duplicate-id' });
  });

  it('never hands out its internal array', async () => {
    const { repo } = await loadReady(withStored(makeRoot()));
    const list = await repo.listExpenses();
    list.length = 0;
    expect((await repo.listExpenses()).length).toBeGreaterThan(0);
  });
});

describe('settings', () => {
  it('merges and persists a settings patch', async () => {
    const backend = withStored(makeRoot());
    const { repo } = await loadReady(backend);
    const result = await repo.updateSettings({ theme: 'dark' });
    expect(result).toEqual({
      ok: true,
      value: { theme: 'dark', seeded: true, lastCategoryId: 'food' },
    });
    expect(stored(backend).settings.theme).toBe('dark');
  });

  it('rejects an invalid patch', async () => {
    const { repo } = await loadReady(withStored(makeRoot()));
    // @ts-expect-error: invalid on purpose
    expect(await repo.updateSettings({ theme: 'sepia' })).toMatchObject({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('corrupt data', () => {
  it.each<[string, unknown, string]>([
    ['unparseable JSON', '{"version":1, oops', 'invalid-json'],
    ['JSON null', 'null', 'invalid-data'],
    ['a wrong shape', { version: 1, expenses: 'nope' }, 'invalid-data'],
    ['a bad record', makeRoot({ expenses: [makeExpense({ amountCents: 1.5 })] }), 'invalid-data'],
    ['a newer version', { ...makeRoot(), version: 99 }, 'newer-version'],
    ['no version', { expenses: [] }, 'invalid-data'],
  ])('reports %s without crashing or overwriting', async (_name, value, reason) => {
    const backend = withStored(value);
    const raw = backend.data.get(STORAGE_KEY);
    const repo = open(backend);
    const result = await repo.load(TODAY);
    expect(result).toMatchObject({ status: 'corrupt', reason, raw });
    expect(result.status === 'corrupt' && result.detail).not.toBe('');
    expect(backend.data.get(STORAGE_KEY)).toBe(raw);
    expect(backend.writes).toBe(0);
  });

  it('names the bad field in the detail', async () => {
    const backend = withStored(makeRoot({ expenses: [makeExpense({ amountCents: 1.5 })] }));
    const result = await open(backend).load(TODAY);
    expect(result.status === 'corrupt' && result.detail).toContain('expenses[0].amountCents');
  });

  it('refuses changes until reset or replace', async () => {
    const backend = withStored('garbage');
    const repo = open(backend);
    await repo.load(TODAY);
    expect(await repo.listExpenses()).toEqual([]);
    expect(await repo.addExpense(lunch)).toEqual({ ok: false, error: 'not-ready' });
    expect(await repo.updateSettings({ theme: 'dark' })).toEqual({ ok: false, error: 'not-ready' });
    expect(backend.data.get(STORAGE_KEY)).toBe('garbage');
  });

  it('reset backs up the corrupt data, then re-seeds', async () => {
    const backend = withStored('garbage');
    const repo = open(backend);
    await repo.load(TODAY);
    const result = await repo.reset(TODAY);
    expect(result.ok).toBe(true);
    expect(backend.data.get(BACKUP_KEY)).toBe('garbage');
    expect(stored(backend).expenses.length).toBeGreaterThan(0);
    expect((await repo.listExpenses()).length).toBeGreaterThan(0);
  });

  it('reset leaves the corrupt data alone if the backup cannot be written', async () => {
    const backend = withStored('garbage');
    const repo = open(backend);
    await repo.load(TODAY);
    backend.failWrites = 'full';
    expect(await repo.reset(TODAY)).toEqual({ ok: false, error: 'storage-full' });
    expect(backend.data.get(STORAGE_KEY)).toBe('garbage');
  });

  it('replace imports valid data over corrupt data', async () => {
    const backend = withStored('garbage');
    const repo = open(backend);
    await repo.load(TODAY);
    const root = makeRoot();
    expect(await repo.replace(JSON.parse(JSON.stringify(root)))).toEqual({ ok: true, value: root });
    expect(stored(backend)).toEqual(root);
    expect(backend.data.get(BACKUP_KEY)).toBe('garbage');
  });
});

describe('reset and replace', () => {
  it('reset re-seeds relative to the given today', async () => {
    const backend = withStored(makeRoot({ expenses: [] }));
    const { repo } = await loadReady(backend);
    const result = await repo.reset('2027-05-20');
    expect(result.ok && result.value.expenses.every((e) => e.date <= '2027-05-20')).toBe(true);
    expect(result.ok && result.value.expenses.some((e) => e.date.startsWith('2027-05'))).toBe(true);
    expect(backend.data.has(BACKUP_KEY)).toBe(false);
  });

  it('replace rejects invalid data and keeps the current data', async () => {
    const original = makeRoot();
    const backend = withStored(original);
    const { repo } = await loadReady(backend);
    const result = await repo.replace({ version: 1, expenses: 'nope' });
    expect(result).toMatchObject({ ok: false, error: 'invalid' });
    expect(stored(backend)).toEqual(original);
    expect(await repo.listExpenses()).toEqual(original.expenses);
  });

  it('replace runs migrations on imported data', async () => {
    const backend = withStored(makeRoot());
    const { repo } = await loadReady(backend, { migrations: [v0ToV1] });
    const result = await repo.replace({ ...makeRoot(), version: 0, settings: { seeded: true } });
    expect(result.ok && result.value.settings.theme).toBe('system');
  });
});

// A fake older format: version 0 had no theme setting.
const v0ToV1: Migration = {
  from: 0,
  migrate: (data) => ({
    ...data,
    settings: { theme: 'system', ...(data.settings as Record<string, unknown>) },
  }),
};

describe('migrations on load', () => {
  it('upgrades old data and writes the upgraded version back', async () => {
    const backend = withStored({ ...makeRoot(), version: 0, settings: { seeded: true } });
    const { result } = await loadReady(backend, { migrations: [v0ToV1] });
    expect(result.root.version).toBe(1);
    expect(result.root.settings.theme).toBe('system');
    expect(stored(backend).version).toBe(1);
    expect(backend.writes).toBe(1);
  });

  it('reports a failed migration as corrupt', async () => {
    const backend = withStored({ version: 0 });
    const broken: Migration = {
      from: 0,
      migrate: () => {
        throw new Error('boom');
      },
    };
    const result = await open(backend, { migrations: [broken] }).load(TODAY);
    expect(result).toMatchObject({ status: 'corrupt', reason: 'migration-failed' });
  });
});

describe('storage failures', () => {
  it('rolls back a change that cannot be written', async () => {
    const original = makeRoot();
    const backend = withStored(original);
    const { repo } = await loadReady(backend);
    backend.failWrites = 'full';
    expect(await repo.addExpense(lunch)).toEqual({ ok: false, error: 'storage-full' });
    expect(await repo.removeExpense(original.expenses[0]?.id ?? '')).toEqual({
      ok: false,
      error: 'storage-full',
    });
    expect(await repo.listExpenses()).toEqual(original.expenses);
    expect(stored(backend)).toEqual(original);
  });

  it('reports other write failures as unavailable', async () => {
    const backend = withStored(makeRoot());
    const { repo } = await loadReady(backend);
    backend.failWrites = 'unavailable';
    expect(await repo.addExpense(lunch)).toEqual({ ok: false, error: 'storage-unavailable' });
  });

  it('falls back to memory when storage cannot be read', async () => {
    const backend = new MemoryBackend();
    backend.failReads = true;
    const { repo, result } = await loadReady(backend);
    expect(result).toMatchObject({ seeded: true, persistent: false });
    expect((await repo.addExpense(lunch)).ok).toBe(true);
    expect(backend.writes).toBe(0);
  });

  it('keeps working in memory when the first save fails', async () => {
    const backend = new MemoryBackend();
    backend.failWrites = 'unavailable';
    const { repo, result } = await loadReady(backend);
    expect(result).toMatchObject({ seeded: true, persistent: false });
    expect((await repo.addExpense(lunch)).ok).toBe(true);
  });
});

describe('before load', () => {
  it('refuses changes and lists nothing', async () => {
    const repo = open(new MemoryBackend());
    expect(await repo.listExpenses()).toEqual([]);
    expect(await repo.addExpense(lunch)).toEqual({ ok: false, error: 'not-ready' });
  });
});
