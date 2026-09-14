// Shared logger for universal-antislop scripts
// Set LOG_LEVEL=debug for verbose output, LOG_LEVEL=error for quiet

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2;

export function log(level, ...args) {
  if (LOG_LEVELS[level] <= currentLevel) {
    const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : level === 'debug' ? 'DEBUG' : '';
    console.error(prefix ? `[${prefix}]` : '', ...args);
  }
}

export function error(...args) { log('error', ...args); }
export function warn(...args) { log('warn', ...args); }
export function info(...args) { log('info', ...args); }
export function debug(...args) { log('debug', ...args); }

export default { log, error, warn, info, debug };
