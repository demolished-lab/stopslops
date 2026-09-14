// Shared logger for universal-antislop scripts
// Set LOG_LEVEL=debug for verbose output, LOG_LEVEL=error for quiet

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2;

// Metrics collector
let metrics = {
  startTime: Date.now(),
  checks: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0 },
  judges: { total: 0, passed: 0, failed: 0, errors: 0 },
  files: { scanned: 0, cached: 0 },
  performance: { checkersMs: 0, judgeMs: 0, totalMs: 0 },
};

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

export function trackCheck(category, result) {
  if (!metrics) metrics = { startTime: Date.now(), checks: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0 }, judges: { total: 0, passed: 0, failed: 0, errors: 0 }, files: { scanned: 0, cached: 0 }, performance: { checkersMs: 0, judgeMs: 0, totalMs: 0 } };
  if (!metrics.checkes) metrics.checkes = { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0 };
  metrics.checkes.total++;
  if (result === 'pass') metrics.checkes.passed++;
  else if (result === 'fail') metrics.checkes.failed++;
  else if (result === 'skip') metrics.checkes.skipped++;
  else if (result === 'error') metrics.checkes.errors++;
}

export function trackJudge(result) {
  metrics.judges.total++;
  if (result === 'pass') metrics.judges.passed++;
  else if (result === 'fail') metrics.judges.failed++;
  else if (result === 'error') metrics.judges.errors++;
}

export function trackFile(cached = false) {
  metrics.files.scanned++;
  if (cached) metrics.files.cached++;
}

export function setPerformance(key, ms) {
  metrics.performance[key] = ms;
}

export function getMetrics() {
  metrics.performance.totalMs = Date.now() - metrics.startTime;
  return { ...metrics };
}

export function printMetrics() {
  const m = getMetrics();
  console.error('\n--- Metrics ---');
  console.error(`Total time: ${m.performance.totalMs}ms`);
  console.error(`Checkers: ${m.performance.checkersMs}ms | Judge: ${m.performance.judgeMs}ms`);
  console.error(`Checks: ${m.checkes.total} (pass:${m.checkes.passed} fail:${m.checkes.failed} skip:${m.checkes.skipped} err:${m.checkes.errors})`);
  console.error(`Judges: ${m.judges.total} (pass:${m.judges.passed} fail:${m.judges.failed} err:${m.judges.errors})`);
  console.error(`Files: ${m.files.scanned} scanned, ${m.files.cached} cached`);
}

export default { log, error, warn, info, debug, trackCheck, trackJudge, trackFile, setPerformance, getMetrics, printMetrics };
