import { createHostApi } from '@novasamatech/host-api';

import { defaultTransport } from './defaultTransport.js';

export const hostApi = createHostApi(defaultTransport);
