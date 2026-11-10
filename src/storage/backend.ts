/**
 * Raw key-value storage. Async so that IndexedDB or a server can replace localStorage by
 * writing one new backend; the repository on top of it stays the same.
 */
export interface StorageBackend {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
}

/** `full`: over quota. `unavailable`: blocked, disabled or otherwise failing storage. */
export type StorageErrorKind = 'full' | 'unavailable';

export class StorageError extends Error {
  constructor(
    readonly kind: StorageErrorKind,
    options?: { cause?: unknown },
  ) {
    super(`Storage ${kind}`, options);
    this.name = 'StorageError';
  }
}
