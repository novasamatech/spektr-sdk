type LoggerFn = (...args: unknown[]) => void;

export type Logger = Record<'info' | 'warn' | 'error' | 'log', LoggerFn>;

export function createDefaultLogger(): Logger {
  return {
    info: (...args) => console.info(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    log: (...args) => console.log(...args),
  };
}
