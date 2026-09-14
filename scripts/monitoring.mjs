#!/usr/bin/env node
// Monitoring and observability with Prometheus metrics
import { createServer } from 'node:http';

// Prometheus metrics format
class PrometheusMetrics {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  // Increment a counter
  incCounter(name, labels = {}, value = 1) {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  // Set a gauge
  setGauge(name, labels = {}, value) {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
  }

  // Observe a histogram
  observeHistogram(name, labels = {}, value) {
    const key = this.createKey(name, labels);
    const observations = this.histograms.get(key) || [];
    observations.push(value);
    this.histograms.set(key, observations);
  }

  // Create a unique key for metric
  createKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  // Format metrics in Prometheus format
  format() {
    const lines = [];
    
    // Format counters
    for (const [key, value] of this.counters) {
      lines.push(`# TYPE ${key.split('{')[0]} counter`);
      lines.push(`${key} ${value}`);
    }
    
    // Format gauges
    for (const [key, value] of this.gauges) {
      lines.push(`# TYPE ${key.split('{')[0]} gauge`);
      lines.push(`${key} ${value}`);
    }
    
    // Format histograms
    for (const [key, observations] of this.histograms) {
      const name = key.split('{')[0];
      lines.push(`# TYPE ${name} histogram`);
      
      const sorted = [...observations].sort((a, b) => a - b);
      const buckets = [0.1, 0.5, 1, 2.5, 5, 10];
      
      for (const bucket of buckets) {
        const count = sorted.filter(v => v <= bucket).length;
        const bucketLabels = key.includes('{') 
          ? key.replace('}', `,le="${bucket}"}`)
          : `${name}{le="${bucket}"}`;
        lines.push(`${bucketLabels} ${count}`);
      }
      
      const sum = sorted.reduce((a, b) => a + b, 0);
      lines.push(`${name}_sum{${key.split('{')[1] || ''}} ${sum}`);
      lines.push(`${name}_count{${key.split('{')[1] || ''}} ${sorted.length}`);
    }
    
    return lines.join('\n');
  }

  // Reset all metrics
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// Global metrics instance
const metrics = new PrometheusMetrics();

// Predefined metrics
export const METRICS = {
  // Request metrics
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
  HTTP_REQUESTS_IN_PROGRESS: 'http_requests_in_progress',
  
  // Checker metrics
  CHECKER_RUNS_TOTAL: 'checker_runs_total',
  CHECKER_DURATION: 'checker_duration_seconds',
  CHECKER_VIOLATIONS: 'checker_violations_total',
  CHECKER_ERRORS: 'checker_errors_total',
  
  // Judge metrics
  JUDGE_RUNS_TOTAL: 'judge_runs_total',
  JUDGE_DURATION: 'judge_duration_seconds',
  JUDGE_VERDICTS: 'judge_verdicts_total',
  
  // System metrics
  SYSTEM_MEMORY_USAGE: 'system_memory_usage_bytes',
  SYSTEM_CPU_USAGE: 'system_cpu_usage',
  SYSTEM_UPTIME: 'system_uptime_seconds',
  
  // Tenant metrics
  TENANT_REQUESTS: 'tenant_requests_total',
  TENANT_STORAGE: 'tenant_storage_bytes',
  
  // Audit metrics
  AUDIT_EVENTS_TOTAL: 'audit_events_total',
  AUDIT_EVENT_SIZE: 'audit_event_size_bytes'
};

// Middleware for HTTP metrics
export function httpMetricsMiddleware(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const path = req.url || '/';
    const method = req.method || 'GET';
    
    // Increment in-progress requests
    metrics.incCounter(METRICS.HTTP_REQUESTS_IN_PROGRESS, { method, path });
    
    // Track response
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Decrement in-progress
      metrics.incCounter(METRICS.HTTP_REQUESTS_IN_PROGRESS, { method, path }, -1);
      
      // Increment total requests
      metrics.incCounter(METRICS.HTTP_REQUESTS_TOTAL, { 
        method, 
        path, 
        status: res.statusCode 
      });
      
      // Observe duration
      metrics.observeHistogram(METRICS.HTTP_REQUEST_DURATION, { method, path }, duration);
      
      originalEnd.apply(this, args);
    };
    
    return handler(req, res);
  };
}

// Record checker metrics
export function recordCheckerMetrics(category, duration, violations, errors = 0) {
  metrics.incCounter(METRICS.CHECKER_RUNS_TOTAL, { category });
  metrics.observeHistogram(METRICS.CHECKER_DURATION, { category }, duration);
  metrics.incCounter(METRICS.CHECKER_VIOLATIONS, { category }, violations);
  if (errors > 0) {
    metrics.incCounter(METRICS.CHECKER_ERRORS, { category }, errors);
  }
}

// Record judge metrics
export function recordJudgeMetrics(category, duration, verdict) {
  metrics.incCounter(METRICS.JUDGE_RUNS_TOTAL, { category });
  metrics.observeHistogram(METRICS.JUDGE_DURATION, { category }, duration);
  metrics.incCounter(METRICS.JUDGE_VERDICTS, { category, verdict });
}

// Record audit event
export function recordAuditEvent(event, size = 0) {
  metrics.incCounter(METRICS.AUDIT_EVENTS_TOTAL, { event });
  if (size > 0) {
    metrics.observeHistogram(METRICS.AUDIT_EVENT_SIZE, { event }, size);
  }
}

// Update system metrics
export function updateSystemMetrics() {
  const memUsage = process.memoryUsage();
  metrics.setGauge(METRICS.SYSTEM_MEMORY_USAGE, { type: 'heap' }, memUsage.heapUsed);
  metrics.setGauge(METRICS.SYSTEM_MEMORY_USAGE, { type: 'rss' }, memUsage.rss);
  metrics.setGauge(METRICS.SYSTEM_MEMORY_USAGE, { type: 'external' }, memUsage.external);
  metrics.setGauge(METRICS.SYSTEM_UPTIME, {}, process.uptime());
}

// Get all metrics
export function getMetrics() {
  updateSystemMetrics();
  return metrics.format();
}

// Reset all metrics
export function resetMetrics() {
  metrics.reset();
}

// Metrics server
export function createMetricsServer(port = 9090) {
  const server = createServer((req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(getMetrics());
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
      console.log(getMetrics());
      break;
      
    case 'reset':
      resetMetrics();
      console.log('Metrics reset');
      break;
      
    default:
      console.log('Monitoring & Observability');
      console.log('');
      console.log('Commands:');
      console.log('  server [port]  Start metrics server (default: 9090)');
      console.log('  print          Print current metrics');
      console.log('  reset          Reset all metrics');
  }
}
