import type { CodecType } from 'scale-ts';

import type { StatementData } from './scale/statementData.js';
import type { Message } from './types.js';

export function toMessage<T>(statementData: CodecType<ReturnType<typeof StatementData<T>>>): Message<T>[] {
  switch (statementData.tag) {
    case 'request':
      return statementData.value.data.map((data, index) => ({
        type: 'request',
        requestId: `${statementData.value.requestId}-${index.toString()}`,
        data,
      }));
    case 'response':
      return [
        {
          type: 'response',
          requestId: statementData.value.requestId,
          code: statementData.value.responseCode,
        },
      ];
  }
}
