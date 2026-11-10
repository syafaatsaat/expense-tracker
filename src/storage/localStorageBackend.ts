import { StorageError, type StorageBackend } from './backend.ts';
import { createRepository, type Repository, type RepositoryOptions } from './repository.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * The only code in the app that touches localStorage. `getStorage` is a function because
 * merely reading `window.localStorage` throws when storage is blocked.
 */
export function createLocalStorageBackend(
  getStorage: () => StorageLike = () => window.localStorage,
): StorageBackend {
  return {
    read(key) {
      try {
        return Promise.resolve(getStorage().getItem(key));
      } catch (cause) {
        return Promise.reject(new StorageError('unavailable', { cause }));
      }
    },
    write(key, value) {
      try {
        getStorage().setItem(key, value);
        return Promise.resolve();
      } catch (cause) {
        return Promise.reject(
          new StorageError(isQuotaError(cause) ? 'full' : 'unavailable', { cause }),
        );
      }
    },
  };
}

export function createLocalStorageRepository(
  options: Omit<RepositoryOptions, 'backend'> = {},
): Repository {
  return createRepository({ ...options, backend: createLocalStorageBackend() });
}
