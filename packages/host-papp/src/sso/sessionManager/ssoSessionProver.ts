import type { StatementProver } from '@novasamatech/statement-store';
import { getStatementSigner, statementCodec } from '@polkadot-api/sdk-statement';
import { err, errAsync, fromThrowable, ok, okAsync } from 'neverthrow';
import { compact } from 'scale-ts';

import { toError } from '../../helpers/utils.js';
import { getSsPub, signWithSsSecret, verifyWithSsSecret } from '../../modules/crypto.js';
import type { UserSession } from '../ssoSessionRepository.js';
import type { UserSecretRepository } from '../userSecretRepository.js';

const verify = fromThrowable(verifyWithSsSecret, toError);

export function createSsoStatementProver(
  userSession: UserSession,
  userSecretRepository: UserSecretRepository,
): StatementProver {
  const secret = userSecretRepository
    .read(userSession.id)
    .andThen(secrets => (secrets ? ok(secrets) : err(new Error(`Secrets for session ${userSession.id} not found.`))))
    .map(x => x.ssSecret);

  return {
    generateMessageProof(statement) {
      return secret.map(secret => {
        const signer = getStatementSigner(getSsPub(secret), 'sr25519', data => signWithSsSecret(secret, data));

        return signer.sign(statement);
      });
    },
    verifyMessageProof(statement) {
      const { proof, ...unsigned } = statement;

      if (!proof) {
        // TODO should we pass check when proof is not presented?
        return okAsync(true);
      }

      const encoded = statementCodec.enc(unsigned);
      const compactLen = compact.enc(compact.dec(encoded)).length;

      switch (proof.type) {
        case 'sr25519':
          return verify(
            encoded.slice(compactLen),
            proof.value.signature.asBytes(),
            proof.value.signer.asBytes(),
          ).asyncAndThen(x => okAsync(x));
        default:
          return errAsync(new Error(`Proof type ${proof.type} is not supported.`));
      }
    },
  };
}
