import type { Result } from '../../helpers/result.js';

export type StorageAdapter = {
  write(key: string, value: string): Promise<Result<void, Error>>;
  read(key: string): Promise<Result<string | null, Error>>;
  clear(key: string): Promise<Result<void, Error>>;
};
