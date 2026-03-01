import pino from 'pino';

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

const isDevelopment = process.env.NODE_ENV !== 'production';

function devLogger(name: string): Logger {
  const prefix = `[${name}]`;
  return {
    debug: (msg, data) => console.debug(prefix, msg, ...(data ? [data] : [])),
    info:  (msg, data) => console.info(prefix, msg,  ...(data ? [data] : [])),
    warn:  (msg, data) => console.warn(prefix, msg,  ...(data ? [data] : [])),
    error: (msg, data) => console.error(prefix, msg, ...(data ? [data] : [])),
  };
}

function prodLogger(name: string): Logger {
  const base = pino({ name, level: 'debug' });
  return {
    debug: (msg, data) => base.debug(data ?? {}, msg),
    info:  (msg, data) => base.info(data ?? {}, msg),
    warn:  (msg, data) => base.warn(data ?? {}, msg),
    error: (msg, data) => base.error(data ?? {}, msg),
  };
}

export function createLogger(name: string): Logger {
  return isDevelopment ? devLogger(name) : prodLogger(name);
}
