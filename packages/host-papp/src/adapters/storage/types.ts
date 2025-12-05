export type StorageAdapter = {
  write(key: string, value: string): Promise<boolean>;
  read(key: string): Promise<string | null>;
};
