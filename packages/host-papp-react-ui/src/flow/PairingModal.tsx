import type { AccountId } from '@novasamatech/statement-store';
import { memo } from 'react';

import { useAuthStatus } from '../hooks/authStatus.js';
import { useIdentity } from '../hooks/identity.js';
import { useAuthentication } from '../providers/AuthProvider.js';
import { useTranslations } from '../providers/TranslationProvider.js';
import { Button } from '../ui/Button.js';
import { Logo } from '../ui/Logo.js';
import { LogoSmall } from '../ui/LogoSmall.js';
import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';
import type { ThemeVariant } from '../ui/Theme.js';
import { Theme } from '../ui/Theme.js';

import styles from './PairingModal.module.css';

type Props = {
  theme?: ThemeVariant;
};

export const PairingModal = memo(({ theme = 'dark' }: Props) => {
  const auth = useAuthentication();
  const { status } = useAuthStatus();

  const open = status.step !== 'none';

  const toggleModal = (open: boolean) => {
    if (!open && status.step !== 'attestation') {
      auth.abortAuthentication();
    }
  };

  return (
    <Theme value={theme}>
      <Modal open={open} onOpenChange={toggleModal} width="fit-content">
        <div className={styles.container}>
          {status.step === 'pairing' && <PairingStep payload={status.payload} />}
          {status.step === 'pairingError' && <PairingErrorStep message={status.message} />}
          {status.step === 'attestation' && <LoadingStep />}
          {status.step === 'attestationError' && <PairingErrorStep message={status.message} />}
          {status.step === 'finished' && <FinishedStep accountId={status.session.remoteAccount.accountId} />}
        </div>
      </Modal>
    </Theme>
  );
});

const PairingStep = ({ payload }: { payload: string }) => {
  const translation = useTranslations();

  return (
    <div className={styles.pairingContainer}>
      <span className={styles.pairingHeader}>{translation.pairingHeader}</span>
      <span className={styles.scanCallToAction}>{translation.pairingScanCallToAction}</span>
      <QrCode value={payload} size={270} />
      <span className={styles.pairingDescription}>{translation.pairingDescription}</span>
    </div>
  );
};

const LoadingStep = () => {
  const translation = useTranslations();

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderLogo}>
        <LogoSmall size={100} />
      </div>
      <span className={styles.loaderText}>{translation.pairingLoader}</span>
    </div>
  );
};

const FinishedStep = ({ accountId }: { accountId: AccountId }) => {
  const auth = useAuthentication();

  const [identity, identityPending] = useIdentity(accountId);

  return (
    <div className={styles.finishedContainer}>
      <div className={styles.finishedLogo}>
        <Logo size={30} />
        <div className={styles.finishedLogoSeparator} />
        <div className={styles.finishedLogoTitle}>Products for People</div>
      </div>
      <div className={styles.finishedWelcome}>Welcome to Polkadot</div>
      <div className={styles.finishedUsername}>
        {identity?.fullUsername ?? identity?.liteUsername ?? (identityPending ? 'Loading...' : 'Unknown user')}
      </div>
      <div className={styles.finishedVoucher}></div>
      <div className={styles.finishedButton}>
        <Button onClick={() => auth.abortAuthentication()}>Let's go</Button>
      </div>
    </div>
  );
};

const PairingErrorStep = ({ message }: { message: string }) => {
  const auth = useAuthentication();
  const translation = useTranslations();

  return (
    <div className={styles.errorContainer}>
      <span className={styles.errorTitle}>Sorry, we've got some troubles!</span>
      <span className={styles.genericText}>{message}</span>
      <div className={styles.errorButton}>
        <Button onClick={() => auth.authenticate()}>{translation.pairingRetry}</Button>
      </div>
    </div>
  );
};
