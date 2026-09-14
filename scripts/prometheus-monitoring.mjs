#!/usr/bin/env node
// Prometheus monitoring for production
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createServer } from 'node:http';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ prefix: 'antislop_' });

// Custom metrics
export const metrics = {
  // HTTP request metrics
  httpRequestDuration: new Histogram({
    name: 'antislop_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10]
  }),

  httpRequestTotal: new Counter({
    name: 'antislop_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  httpRequestsInProgress: new Gauge({
    name: 'antislop_http_requests_in_progress',
    help: 'Number of HTTP requests currently in progress',
    labelNames: ['method', 'route']
  }),

  // Checker metrics
  checkerRunsTotal: new Counter({
    name: 'antislop_checker_runs_total',
    help: 'Total number of checker runs',
    labelNames: ['category', 'status']
  }),

  checkerDuration: new Histogram({
    name: 'antislop_checker_duration_seconds',
    help: 'Duration of checker runs in seconds',
    labelNames: ['category'],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10]
  }),

  checkerViolations: new Counter({
    name: 'antislop_checker_violations_total',
    help: 'Total number of checker violations',
    labelNames: ['category', 'severity']
  }),

  // Judge metrics
  judgeRunsTotal: new Counter({
    name: 'antislop_judge_runs_total',
    help: 'Total number of judge runs',
    labelNames: ['category', 'verdict']
  }),

  judgeDuration: new Histogram({
    name: 'antislop_judge_duration_seconds',
    help: 'Duration of judge runs in seconds',
    labelNames: ['category'],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10]
  }),

  // Storage metrics
  storageOperationsTotal: new Counter({
    name: 'antislop_storage_operations_total',
    help: 'Total number of storage operations',
    labelNames: ['operation', 'status']
  }),

  storageDuration: new Histogram({
    name: 'antislop_storage_duration_seconds',
    help: 'Duration of storage operations in seconds',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5]
  }),

  // Tenant metrics
  tenantRequestsTotal: new Counter({
    name: 'antislop_tenant_requests_total',
    help: 'Total number of tenant requests',
    labelNames: ['tenant_id', 'endpoint']
  }),

  // System metrics
  systemUptime: new Gauge({
    name: 'antislop_system_uptime_seconds',
    help: 'System uptime in seconds'
  }),

  systemMemoryUsage: new Gauge({
    name: 'antislop_system_memory_usage_bytes',
    help: 'System memory usage in bytes',
    labelNames: ['type']
  })
};

// Middleware for HTTP metrics
export function httpMetricsMiddleware(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const method = req.method || 'GET';
    const route = req.url || '/';

    // Increment in-progress requests
    metrics.httpRequestsInProgress.inc({ method, route });

    // Track response
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode || 200;

      // Decrement in-progress
      metrics.httpRequestsInProgress.dec({ method, route });

      // Increment total requests
      metrics.httpRequestTotal.inc({ method, route, status_code: statusCode });

      // Observe duration
      metrics.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

      originalEnd.apply(this, args);
    };

    return handler(req, res);
  };
}

// Record checker metrics
export function recordCheckerMetrics(category, duration, violations, status = 'success') {
  metrics.checkerRunsTotal.inc({ category, status });
  metrics.checkerDuration.observe({ category }, duration);

  if (violations > 0) {
    metrics.checkerViolations.inc({ category, severity: 'violation' }, violations);
  }
}

// Record judge metrics
export function recordJudgeMetrics(category, duration, verdict) {
  metrics.judgeRunsTotal.inc({ category, verdict });
  metrics.judgeDuration.observe({ category }, duration);
}

// Record storage metrics
export function recordStorageMetrics(operation, duration, status = 'success') {
  metrics.storageOperationsTotal.inc({ operation, status });
  metrics.storageDuration.observe({ operation }, duration);
}

// Update system metrics
export function updateSystemMetrics() {
  const memUsage = process.memoryUsage();
  metrics.systemUptime.set(process.uptime());
  metrics.systemMemoryUsage.set({ type: 'heap' }, memUsage.heapUsed);
  metrics.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
  metrics.systemMemoryUsage.set({ type: 'external' }, memUsage.external);
}

// Get all metrics in Prometheus format
export async function getMetrics() {
  updateSystemMetrics();
  return register.metrics();
}

// Get metrics as JSON
export async function getMetricsJSON() {
  updateSystemMetrics();
  return register.getSingleMetricAsString();
}

// Create metrics server
export function createMetricsServer(port = 9090) {
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(await getMetrics());
    } else if (req.url === '/metrics/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(await getMetricsJSON());
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Metrics server running on http://localhost:${port}/metrics`);
  });

  return server;
}

// Reset all metrics
export function resetMetrics() {
  register.resetMetrics();
}

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2] || 'server';

  switch (command) {
    case 'server':
      const port = parseInt(process.argv[3] || '9090');
      createMetricsServer(port);
      break;

    case 'print':
      updateSystemMetrics();
      console.log(await getMetrics());
      break;

    case 'json':
      updateSystemMetrics();
      console.log(await getMetricsJSON());
      break;

    case 'reset':
      resetMetrics();
      console.log('Metrics reset');
      break;

    default:
      console.log('Prometheus Monitoring');
      console.log('');
      console.log('Commands:');
      console.log('  server [port]  Start metrics server (default: 9090)');
      console.log('  print          Print metrics in Prometheus format');
      console.log('  json           Print metrics as JSON');
      console.log('  reset          Reset all metrics');
  }
}
