import type { Codec, CodecType } from 'scale-ts';

import type { StatementData } from './scale/statementData.js';
import type { Message } from './types.js';

export function toMessage<T>(statementData: CodecType<typeof StatementData>, codec: Codec<T>): Message<T>[] {
  switch (statementData.tag) {
    case 'request':
      return statementData.value.data.map((payload, index) => ({
        type: 'request',
        localId: `${statementData.value.requestId}-${index.toString()}`,
        requestId: statementData.value.requestId,
        payload: codec.dec(payload),
      }));
    case 'response':
      return [
        {
          type: 'response',
          localId: statementData.value.requestId,
          requestId: statementData.value.requestId,
          responseCode: statementData.value.responseCode,
        },
      ];
  }
}
