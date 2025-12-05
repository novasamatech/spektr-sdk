import type { Logger } from './types.js';

export function createDefaultLogger(): Logger {
  return {
    info: (...args) => console.info(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    log: (...args) => console.log(...args),
  };
}
