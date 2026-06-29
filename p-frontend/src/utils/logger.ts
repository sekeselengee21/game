const isDevelopment = import.meta.env.DEV;

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

export const logger = {
  log: (..._args: any[]) => {},

  warn: (..._args: any[]) => {},

  error: (...args: any[]) => {
    if (isDevelopment && args[0]?.includes?.("WebSocket error")) {
      originalConsole.error("[CRITICAL]", ...args);
    }
  },

  info: (..._args: any[]) => {},

  debug: (..._args: any[]) => {},
};
