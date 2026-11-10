import { StorageError } from './backend.ts';
import { createLocalStorageBackend } from './localStorageBackend.ts';

afterEach(() => localStorage.clear());

describe('createLocalStorageBackend', () => {
  it('reads back what it wrote, using window.localStorage by default', async () => {
    const backend = createLocalStorageBackend();
    await backend.write('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(await backend.read('k')).toBe('v');
  });

  it('reads a missing key as null', async () => {
    expect(await createLocalStorageBackend().read('missing')).toBeNull();
  });

  it('maps a quota error to a "full" StorageError', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    };
    const error: unknown = await createLocalStorageBackend(() => storage)
      .write('k', 'v')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).kind).toBe('full');
  });

  it('maps blocked storage to an "unavailable" StorageError', async () => {
    const blocked = () => {
      throw new DOMException('Access denied', 'SecurityError');
    };
    const backend = createLocalStorageBackend(blocked);
    await expect(backend.read('k')).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(backend.write('k', 'v')).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
