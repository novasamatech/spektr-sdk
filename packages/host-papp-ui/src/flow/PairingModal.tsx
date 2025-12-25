import type { PropsWithChildren } from 'react';
import { memo, useMemo } from 'react';

import { useIdentity } from '../hooks/identity.js';
import { useAuthentication } from '../providers/AuthProvider.js';
import { useTranslations } from '../providers/TranslationProvider.js';
import { Button } from '../ui/Button.js';
import { Loader } from '../ui/Loader.js';
import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';
import type { ThemeVariant } from '../ui/Theme.js';
import { Theme } from '../ui/Theme.js';

import styles from './PairingModal.module.css';

type Props = {
  theme?: ThemeVariant;
};

export const PairingModal = memo(({ theme = 'dark' }: Props) => {
  const translation = useTranslations();

  const auth = useAuthentication();
  const open = auth.status.step !== 'none';

  const toggleModal = (open: boolean) => {
    if (!open) {
      auth.abortAuthentication();
    }
  };

  const signedInUser = useMemo(() => {
    if (auth.status.step === 'finished') {
      return auth.status.session;
    }
    return null;
  }, [auth.status.step]);

  const [identity, identityPending] = useIdentity(signedInUser?.remoteAccount.accountId ?? null);

  return (
    <Theme value={theme}>
      <Modal isOpen={open} onOpenChange={toggleModal} width={425}>
        <div className={styles.container}>
          <span className={styles.header}>{translation.pairingHeader}</span>
          <span className={styles.scanCallToAction}>{translation.pairingScanCallToAction}</span>
          {auth.status.step === 'error' && (
            <div className={styles.error}>
              <span className={styles.genericText}>{auth.status.message}</span>
              <Button onClick={() => auth.authenticate()}>{translation.pairingRetry}</Button>
            </div>
          )}
          {auth.status.step === 'attestation' && (
            <div className={styles.loader}>
              <Loader size={20} />
              <span className={styles.genericText}>{translation.pairingAttestationLoader}</span>
            </div>
          )}
          {auth.status.step === 'pairing' && <QrCode value={auth.status.payload} size={270} />}
          {auth.status.step === 'finished' && (
            <>
              <span className={styles.genericText}>
                {translation.pairingWelcomeMessage} {identity?.liteUsername ?? (identityPending ? '...' : 'user')}!
              </span>
            </>
          )}
          <span className={styles.description}>{translation.pairingDescription}</span>
        </div>
      </Modal>
    </Theme>
  );
});
