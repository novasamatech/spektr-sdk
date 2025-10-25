import { Struct, str } from 'scale-ts';

export const papiProviderSendMessageV1Encoder = Struct({
  chainId: str,
  message: str,
});

export const papiProviderReceiveMessageV1Encoder = Struct({
  chainId: str,
  message: str,
});
