import type { ResultAsync } from 'neverthrow';
import type { Codec, CodecType } from 'scale-ts';

import type { Callback } from '../../types.js';

export type Session<T extends Codec<any>> = {
  subscribe(callback: Callback<CodecType<T>, ResultAsync<boolean, Error>>): VoidFunction;
  dispose(): void;
};

export type Account = {
  accountId: Uint8Array;
  publicKey: Uint8Array;
  pin: string | undefined;
};
