import { StorageError, type StorageBackend } from '../storage/backend.ts';

/** In-memory StorageBackend for tests, with switches to simulate storage failures. */
export class MemoryBackend implements StorageBackend {
  readonly data = new Map<string, string>();
  writes = 0;
  failReads = false;
  failWrites: false | 'full' | 'unavailable' = false;

  read(key: string): Promise<string | null> {
    if (this.failReads) return Promise.reject(new StorageError('unavailable'));
    return Promise.resolve(this.data.get(key) ?? null);
  }

  write(key: string, value: string): Promise<void> {
    if (this.failWrites) return Promise.reject(new StorageError(this.failWrites));
    this.writes += 1;
    this.data.set(key, value);
    return Promise.resolve();
  }
}
