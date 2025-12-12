import type { StorageAdapter } from '../../adapters/storage/types.js';
import type { Result } from '../../helpers/result.js';
import { err, ok, seq } from '../../helpers/result.js';
import { createSecretStorage } from '../../modules/secretStorage.js';
import { reactiveStorage } from '../../modules/syncStorage.js';

import type { UserSecrets, UserSession } from './types.js';

export const createUserStorage = (appId: string, storage: StorageAdapter) => {
  const secretStorage = createSecretStorage(appId, storage);
  const usersStorage = createSessionsStorage(storage);
  const selectedUserStorage = createSelectedUserStorage(storage);

  const store = {
    sessions: {
      async read(accountId: string): Promise<Result<UserSession | null>> {
        const user = await secretStorage.readSessionTopic(accountId).then(existingSessionTopic =>
          existingSessionTopic.map<UserSession | null>(sessionTopic => {
            return sessionTopic ? { sessionTopic, accountId } : null;
          }),
        );

        await user
          .andThen(v => (v ? ok(undefined) : err('User not found')))
          .orElsePromise(() => store.sessions.remove(accountId));

        return user;
      },

      async readSelectedUser(): Promise<Result<UserSession | null>> {
        const selectedUser = await store.accounts.readSelectedUser();

        return selectedUser.andThenPromise<Result<UserSession | null>>(async selectedUser => {
          if (selectedUser === null) {
            return ok(null);
          }

          const user = await store.sessions.read(selectedUser);

          return user.andThenPromise(async user => {
            if (user === null) {
              await selectedUserStorage.clear();
            }

            return ok(user);
          });
        });
      },

      async create(user: UserSession, secrets: UserSecrets): Promise<Result<UserSession>> {
        return (await usersStorage.add(user.accountId)).andThenPromise(async () =>
          seq(
            await selectedUserStorage.write(user.accountId),
            await secretStorage.writeSsSecret(user.accountId, secrets.ss),
            await secretStorage.writeEncrSecret(user.accountId, secrets.encr),
            await secretStorage.writeSessionTopic(user.accountId, user.sessionTopic),
          ).map(() => user),
        );
      },

      async remove(accountId: string): Promise<Result<void, Error>> {
        const op = seq(
          await selectedUserStorage.read(),
          await usersStorage.remove(accountId),
          await secretStorage.clearSsSecret(accountId),
          await secretStorage.clearEncrSecret(accountId),
          await secretStorage.clearSessionTopic(accountId),
        );

        return op.andThenPromise(async ([selectedUser, users]) => {
          if (selectedUser === accountId) {
            const nextSelectedUser = users.at(0);

            if (nextSelectedUser) {
              return selectedUserStorage.write(nextSelectedUser).then(x => x.map(() => undefined));
            } else {
              return selectedUserStorage.clear();
            }
          }

          return ok(undefined);
        });
      },
    },

    accounts: {
      async read() {
        return usersStorage.read();
      },

      subscribe(callback: (accounts: string[]) => void) {
        return usersStorage.subscribe(callback);
      },

      readSelectedUser() {
        return selectedUserStorage.read();
      },

      subscribeSelectedAccount(callback: (accountId: string | null) => void): VoidFunction {
        return selectedUserStorage.subscribe(callback);
      },

      async select(accountId: string) {
        return selectedUserStorage.write(accountId);
      },
    },
  };

  return store;
};

const createSessionsStorage = (storage: StorageAdapter) => {
  const reactive = reactiveStorage<string[]>({
    storage,
    key: 'Users',
    autosync: true,
    initial: [],
    from: x => JSON.parse(x),
    to: x => JSON.stringify(x),
  });

  return {
    async read(): Promise<Result<string[], Error>> {
      return reactive.read();
    },

    async add(user: string) {
      const users = await reactive.read();

      return users.andThenPromise(async users => {
        if (users.some(x => x === user)) {
          throw new Error(`User ${user} already exists.`);
        }
        const newUsers = users.concat(user);

        return reactive.write(newUsers).then(x => x.map(() => newUsers));
      });
    },

    async remove(user: string) {
      const users = await reactive.read();

      return users.andThenPromise(async users => {
        const newUsers = users.filter(x => x !== user);

        if (newUsers.length !== users.length) {
          return reactive.write(newUsers).then(x => x.map(() => newUsers));
        }

        return ok<string[]>([]);
      });
    },

    subscribe(callback: (accounts: string[]) => void) {
      return reactive.subscribe(v => {
        callback(v ?? []);
      });
    },
  };
};

const createSelectedUserStorage = (storage: StorageAdapter) => {
  return reactiveStorage<string | null>({
    storage,
    key: 'SelectedUser',
    autosync: true,
    initial: null,
    from: x => x,
    to: x => x,
  });
};
