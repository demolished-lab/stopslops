#!/usr/bin/env node
// Load testing: concurrent requests, stress testing, performance under load
// Usage: node loadtest.mjs [--concurrent 10] [--duration 60] [--target http://localhost:3000]

import { performance } from 'node:perf_hooks';
import { ResilientClient } from './resilience.mjs';

const args = process.argv.slice(2);
function arg(name, defaultVal) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : defaultVal;
}

const CONCURRENT = parseInt(arg('--concurrent', '10'));
const DURATION = parseInt(arg('--duration', '30'));
const TARGET = arg('--target', 'http://localhost:3000');
const RAMP_UP = parseInt(arg('--rampup', '5'));

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencySum: 0,
  latencyMin: Infinity,
  latencyMax: 0,
  latencies: [],
  errors: {},
  startTime: Date.now(),
  statusCodes: {}
};

// Resilient HTTP client
const client = new ResilientClient({
  circuitBreaker: { failureThreshold: 10, resetTimeout: 30000 },
  retry: { maxRetries: 2, baseDelay: 500 },
  rateLimit: { maxRequests: 100, windowMs: 10000 }
});

async function makeRequest() {
  const start = performance.now();
  
  try {
    const response = await client.request(async () => {
      const res = await fetch(`${TARGET}/health`);
      return res;
    });
    
    const latency = performance.now() - start;
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.latencySum += latency;
    metrics.latencyMin = Math.min(metrics.latencyMin, latency);
    metrics.latencyMax = Math.max(metrics.latencyMax, latency);
    metrics.latencies.push(latency);
    
    const status = response.status;
    metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;
    
    return { success: true, latency, status };
  } catch (error) {
    const latency = performance.now() - start;
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.latencySum += latency;
    metrics.latencies.push(latency);
    
    const errorType = error.code || error.message;
    metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1;
    
    return { success: false, latency, error: errorType };
  }
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, index)];
}

function printReport() {
  const duration = (Date.now() - metrics.startTime) / 1000;
  const rps = metrics.totalRequests / duration;
  const avgLatency = metrics.latencySum / metrics.totalRequests;
  
  console.log('\n=== Load Test Report ===\n');
  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log(`Concurrent: ${CONCURRENT}`);
  console.log(`Target: ${TARGET}`);
  console.log(`Ramp-up: ${RAMP_UP}s\n`);
  
  console.log('--- Requests ---');
  console.log(`Total: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests}`);
  console.log(`Failed: ${metrics.failedRequests}`);
  console.log(`RPS: ${rps.toFixed(1)}\n`);
  
  console.log('--- Latency (ms) ---');
  console.log(`Min: ${metrics.latencyMin.toFixed(1)}`);
  console.log(`Max: ${metrics.latencyMax.toFixed(1)}`);
  console.log(`Avg: ${avgLatency.toFixed(1)}`);
  console.log(`P50: ${percentile(metrics.latencies, 50).toFixed(1)}`);
  console.log(`P95: ${percentile(metrics.latencies, 95).toFixed(1)}`);
  console.log(`P99: ${percentile(metrics.latencies, 99).toFixed(1)}\n`);
  
  console.log('--- Status Codes ---');
  for (const [code, count] of Object.entries(metrics.statusCodes)) {
    console.log(`  ${code}: ${count}`);
  }
  
  if (Object.keys(metrics.errors).length > 0) {
    console.log('\n--- Errors ---');
    for (const [error, count] of Object.entries(metrics.errors)) {
      console.log(`  ${error}: ${count}`);
    }
  }
  
  console.log('\n--- Circuit Breaker ---');
  console.log(JSON.stringify(client.getStatus().circuitBreaker, null, 2));
  
  // Pass/fail criteria
  const passCriteria = {
    rps: rps >= 10,
    errorRate: (metrics.failedRequests / metrics.totalRequests) <= 0.01,
    p99Latency: percentile(metrics.latencies, 99) <= 1000
  };
  
  console.log('\n--- Pass/Fail ---');
  console.log(`RPS >= 10: ${passCriteria.rps ? 'PASS' : 'FAIL'}`);
  console.log(`Error Rate <= 1%: ${passCriteria.errorRate ? 'PASS' : 'FAIL'}`);
  console.log(`P99 Latency <= 1000ms: ${passCriteria.p99Latency ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(passCriteria).every(v => v);
  console.log(`\nOverall: ${allPassed ? 'PASS' : 'FAIL'}`);
  
  return allPassed;
}

async function runLoadTest() {
  console.log(`Starting load test: ${CONCURRENT} concurrent for ${DURATION}s`);
  console.log(`Target: ${TARGET}\n`);
  
  // Ramp up
  console.log(`Ramping up over ${RAMP_UP}s...`);
  const rampInterval = RAMP_UP * 1000 / CONCURRENT;
  
  for (let i = 0; i < CONCURRENT; i++) {
    setTimeout(() => {
      // Start continuous requests
      const interval = setInterval(async () => {
        await makeRequest();
      }, 100);
      
      // Stop after duration
      setTimeout(() => {
        clearInterval(interval);
      }, DURATION * 1000);
    }, i * rampInterval);
  }
  
  // Wait for test to complete
  await new Promise(resolve => setTimeout(resolve, (RAMP_UP + DURATION) * 1000 + 1000));
  
  const passed = printReport();
  process.exit(passed ? 0 : 1);
}

runLoadTest().catch(e => {
  console.error('Load test failed:', e.message);
  process.exit(1);
});
