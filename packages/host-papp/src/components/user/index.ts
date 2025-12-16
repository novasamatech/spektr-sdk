import { okAsync } from 'neverthrow';

import type { StorageAdapter } from '../../adapters/storage/types.js';
import type { Transport } from '../../modules/transport/transport.js';

import type { SsoSession } from './ssoSession.js';
import { createSSOSession } from './ssoSession.js';
import type { UserSession, UserSessionStorage } from './userSessionStorage.js';

export type UserSessionsComponent = ReturnType<typeof createUserSessionsComponent>;

type Params = {
  transport: Transport;
  storage: StorageAdapter;
  userSessionStorage: UserSessionStorage;
};

export function createUserSessionsComponent({ userSessionStorage, storage, transport }: Params) {
  let unsubStatements: VoidFunction | null = null;

  const disconnect = (session: UserSession) => {
    return userSessionStorage.mutate(sessions => sessions.filter(s => s.id !== session.id)).map(() => undefined);
  };

  const unsubSessions = userSessionStorage.subscribe(userSessions => {
    if (unsubStatements) {
      unsubStatements();
      unsubStatements = null;
    }

    const ssoSessions: SsoSession[] = [];

    for (const userSession of userSessions) {
      const session = createSSOSession({
        ownAccount: userSession.host,
        peerAccount: userSession.peer,
        storage,
        transport,
      });

      session.subscribe(message => {
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

      ssoSessions.push(session);
    }

    unsubStatements = () => {
      for (const session of ssoSessions) {
        session.dispose();
      }
    };
  });

  return {
    sessions: userSessionStorage,

    disconnect,

    destroy() {
      unsubSessions();
    },
  };
}

// function createDisconnectMessage(ssSecret: SsSecret, topic: Uint8Array) {
//   const statement = createStatement(ssSecret, {
//     priority: 0,
//     channel: createRequestChannel(topic),
//     topics: [topic],
//     data: SSOMessage.enc({
//       tag: 'Disconnected',
//       value: undefined,
//     }),
//   });
// }
