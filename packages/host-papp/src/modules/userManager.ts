import type { StorageAdapter } from '../adapters/storage/types.js';
import type { Result } from '../helpers/result.js';
import { err, ok, seq } from '../helpers/result.js';
import type { SessionTopic } from '../types.js';

import { createSecretStorage } from './secretStorage.js';

export type User = {
  accountId: string;
  sessionTopic: SessionTopic;
};

export const createUserManager = (appId: string, storage: StorageAdapter) => {
  const secretStorage = createSecretStorage(appId, storage);
  const usersStorage = createUserStorage(storage);
  const selectedUserStorage = createSelectedUserStorage(storage);

  const manager = {
    async readSelectedUser(): Promise<Result<User | null>> {
      const selectedUser = await selectedUserStorage.read();

      return selectedUser.andThenPromise<Result<User | null>>(async selectedUser => {
        if (selectedUser === null) {
          return ok(null);
        }

        const user = await manager.readUser(selectedUser);

        return user.andThenPromise(async user => {
          if (user === null) {
            await selectedUserStorage.clear();
          }

          return ok(user);
        });
      });
    },

    async readUser(accountId: string): Promise<Result<User | null>> {
      const user = await secretStorage.readSessionTopic(accountId).then(existingSessionTopic =>
        existingSessionTopic.map<User | null>(sessionTopic => {
          return sessionTopic ? { sessionTopic, accountId } : null;
        }),
      );

      await user
        .andThen(v => (v ? ok(undefined) : err('User not found')))
        .orElsePromise(() => manager.removeUser(accountId));

      return user;
    },

    async createUser(user: User): Promise<Result<User>> {
      return (await usersStorage.add(user.accountId)).andThenPromise(async () =>
        seq(
          await selectedUserStorage.write(user.accountId),
          await secretStorage.writeSessionTopic(user.accountId, user.sessionTopic),
        ).map(() => user),
      );
    },

    async removeUser(accountId: string): Promise<Result<void, Error>> {
      const op = seq(await selectedUserStorage.read(), await usersStorage.remove(accountId));

      return op.andThenPromise(async ([selectedUser, users]) => {
        if (selectedUser === accountId) {
          const nextSelectedUser = users.at(0);

          if (nextSelectedUser) {
            await selectedUserStorage.write(nextSelectedUser);
          } else {
            await selectedUserStorage.clear();
          }
        }

        return secretStorage.clearSessionTopic(accountId);
      });
    },

    async readAccounts() {
      return usersStorage.read();
    },

    async selectAccount(accountId: string) {
      return selectedUserStorage.write(accountId);
    },
  };

  return manager;
};

const createUserStorage = (storage: StorageAdapter) => {
  const KEY = 'Users';

  return {
    async read(): Promise<Result<string[], Error>> {
      const users = await storage.read(KEY);

      return users.map(users => {
        return users === null ? [] : JSON.parse(users);
      });
    },

    async add(user: string) {
      const usersRaw = await storage.read(KEY);
      const users = usersRaw.map<string[]>(x => (x ? JSON.parse(x) : []));

      return users.andThenPromise(async users => {
        if (users.some(x => x === user)) {
          throw new Error(`User ${user} already exists.`);
        }

        const newUsers = users.concat(user);

        return storage.write(KEY, JSON.stringify(newUsers)).then(x => x.map(() => newUsers));
      });
    },

    async remove(user: string) {
      const usersRaw = await storage.read(KEY);
      const users = usersRaw.map<string[]>(x => (x ? JSON.parse(x) : []));

      return users.andThenPromise(async users => {
        const newUsers = users.filter(x => x !== user);

        if (newUsers.length !== users.length) {
          return storage.write(KEY, JSON.stringify(newUsers)).then(x => x.map(() => newUsers));
        }

        return ok<string[]>([]);
      });
    },
  };
};

const createSelectedUserStorage = (storage: StorageAdapter) => {
  const KEY = 'SelectedUser';

  return {
    read() {
      return storage.read(KEY);
    },

    write(accountId: string) {
      return storage.write(KEY, accountId);
    },

    clear() {
      return storage.clear(KEY);
    },
  };
};
