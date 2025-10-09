import type { InjectedAccount, KeypairType } from '@polkadot-api/pjs-signer';
import { _void, type Codec, type CodecType, Enum, Option, str, Struct, Vector } from 'scale-ts';
import { createTransportEncoder } from '../createTransportEncoder';

const keypairCodec = Enum<Record<KeypairType, Codec<undefined>>>({
  ed25519: _void,
  sr25519: _void,
  ecdsa: _void,
});
const keypairEncoder = createTransportEncoder<KeypairType, typeof keypairCodec>({
  codec: keypairCodec,
  from: v => v.tag,
  to: keypair => ({
    tag: keypair,
    value: undefined,
  }),
});

const injectedAccountCodec = Struct({
  address: str,
  genesisHash: Option(str),
  name: Option(str),
  type: Option(keypairEncoder),
});

/**
 * @see {import('@polkadot/extension-inject/types').InjectedAccount}
 */
export type InjectedAccountSchema = CodecType<typeof injectedAccountEncoder>;
const injectedAccountEncoder = createTransportEncoder<InjectedAccount, typeof injectedAccountCodec>({
  codec: injectedAccountCodec,
  from(decoded) {
    return {
      address: decoded.address,
      genesisHash: decoded.genesisHash,
      name: decoded.name,
      type: decoded.type,
    };
  },
  to(value) {
    return {
      address: value.address,
      genesisHash: value.genesisHash ? value.genesisHash : undefined,
      name: value.name,
      type: value.type,
    };
  },
});

export const getAccountsRequestV1Encoder = _void;
export const getAccountsResponseV1Encoder = Vector(injectedAccountEncoder);
