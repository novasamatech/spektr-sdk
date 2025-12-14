import type { StatementAdapter } from '../../adapters/statement/types.js';

import type { UserStorage } from './storage.js';

type Params = {
  /**
   * Host app Id.
   * CAUTION! This value should be stable.
   */
  appId: string;
  statements: StatementAdapter;
  userStorage: UserStorage;
};

export function createUserComponent({ userStorage }: Params) {
  const userModule = {
    disconnect(accountId: string) {
      return userStorage.sessions.remove(accountId);
    },
  };

  return userModule;
}
