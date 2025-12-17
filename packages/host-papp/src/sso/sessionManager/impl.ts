import type { StatementStoreAdapter } from '@novasamatech/statement-store';
import { createEncryption } from '@novasamatech/statement-store';
import type { StorageAdapter } from '@novasamatech/storage-adapter';
import { okAsync } from 'neverthrow';

import type { SsoSessionRepository, UserSession } from '../ssoSessionRepository.js';
import type { UserSecretRepository } from '../userSecretRepository.js';

import { createSsoSession } from './ssoSession.js';
import { createSsoStatementProver } from './ssoSessionProver.js';

export type SsoSessionManager = ReturnType<typeof createSsoSessionManager>;

type Params = {
  storage: StorageAdapter;
  statementStore: StatementStoreAdapter;
  ssoSessionRepository: SsoSessionRepository;
  userSecretRepository: UserSecretRepository;
};

export function createSsoSessionManager({
  ssoSessionRepository,
  userSecretRepository,
  statementStore,
  storage,
}: Params) {
  let unsubStatements: VoidFunction | null = null;

  const disconnect = (session: UserSession) => {
    return ssoSessionRepository.filter(s => s.id !== session.id).map(() => undefined);
  };

  const unsubSessions = ssoSessionRepository.subscribe(userSessions => {
    if (unsubStatements) {
      unsubStatements();
      unsubStatements = null;
    }

    const ssoSessions: VoidFunction[] = [];

    for (const userSession of userSessions) {
      const session = createSession(userSession, statementStore, storage, userSecretRepository);

      const unsubscribe = session.subscribe(message => {
        switch (message.data.tag) {
          case 'v1': {
            switch (message.data.value.tag) {
              case 'Disconnected':
                return disconnect(userSession).map(() => true);
            }
          }
        }

        return okAsync(false);
      });

      ssoSessions.push(unsubscribe);
    }

    unsubStatements = () => {
      for (const unsubscribe of ssoSessions) {
        unsubscribe();
      }
    };
  });

  return {
    sessions: {
      read: ssoSessionRepository.read,
      subscribe: ssoSessionRepository.subscribe,
    },

    disconnect(userSession: UserSession) {
      const session = createSession(userSession, statementStore, storage, userSecretRepository);

      return session.sendDisconnectMessage().andThen(() => disconnect(userSession));
    },

    destroy() {
      unsubSessions();
    },
  };
}

function createSession(
  userSession: UserSession,
  statementStore: StatementStoreAdapter,
  storage: StorageAdapter,
  userSecretRepository: UserSecretRepository,
) {
  const encryption = createEncryption(userSession.remote.publicKey);
  const prover = createSsoStatementProver(userSession, userSecretRepository);
  return createSsoSession({
    userSession,
    statementStore,
    encryption,
    storage,
    prover,
  });
}
