import type { HexString } from '@novasamatech/host-api';
import { fromHex, toHex } from '@polkadot-api/utils';
import { Bytes, enhanceCodec } from 'scale-ts';

export const hexCodec = enhanceCodec<Uint8Array, HexString>(Bytes(), fromHex, v => toHex(v) as HexString);
