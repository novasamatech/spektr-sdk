import { Result, Tuple, _void, str } from 'scale-ts';

import { GenericErr, Hex } from '../commonCodecs.js';

export const JsonRpcMessageSendV1_request = Tuple(Hex, str);
export const JsonRpcMessageSendV1_response = Result(_void, GenericErr);

export const JsonRpcMessageSubscribeV1_start = Hex;
export const JsonRpcMessageSubscribeV1_receive = str;
