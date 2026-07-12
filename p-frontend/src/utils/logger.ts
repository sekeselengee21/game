const isDevelopment = import.meta.env.DEV;

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: noop,

  warn: noop,

  error: (...args: unknown[]) => {
    if (isDevelopment && typeof args[0] === "string" && args[0].includes("WebSocket error")) {
      originalConsole.error("[CRITICAL]", ...args);
    }
  },

  info: noop,

  debug: noop,
};
