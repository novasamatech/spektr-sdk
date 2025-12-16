import type { Identity, UserSession } from '@novasamatech/host-papp';
import { toHex } from '@polkadot-api/utils';
import { useEffect, useState } from 'react';

import { usePapp } from '../flow/PappProvider.js';

export function useIdentity(accountId: string | null) {
  const papp = usePapp();
  const [pending, setPending] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    if (!accountId) {
      setPending(false);
      return;
    }

    let mounted = true;

    setPending(true);
    papp.identity.getIdentity(accountId).match(
      identity => {
        if (mounted) {
          setIdentity(identity);
          setPending(false);
        }
      },
      () => {
        if (mounted) {
          setIdentity(null);
          setPending(false);
        }
      },
    );

    return () => {
      setPending(false);
      mounted = false;
    };
  }, [accountId]);

  return [identity, pending] as const;
}

export function useSessionIdentity(session: UserSession | null) {
  return useIdentity(session ? toHex(session.peer.accountId) : null);
}
