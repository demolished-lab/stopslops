#!/usr/bin/env k6
// k6 load testing script for Universal Anti-Slop
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const requestCount = new Counter('request_count');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || '';

// Load test configuration
export const options = {
  scenarios: {
    // Constant load scenario
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'constantLoad'
    },
    // Ramp-up scenario
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 20 },
        { duration: '20s', target: 0 }
      ],
      exec: 'rampUp'
    },
    // Fixed iteration scenario
    fixed_iterations: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      exec: 'fixedIterations'
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01']
  }
};

// Setup function
export function setup() {
  console.log(`Running load tests against ${BASE_URL}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100
  });

  return {
    baseUrl: BASE_URL,
    apiKey: API_KEY
  };
}

// Constant load scenario
export function constantLoad(data) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (data.apiKey) {
    headers['Authorization'] = `Bearer ${data.apiKey}`;
  }

  // Health check
  const healthRes = http.get(`${data.baseUrl}/health`, { headers });
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100
  });
  requestDuration.add(healthRes.timings.duration);
  requestCount.add(1);
  errorRate.add(healthRes.status !== 200);

  sleep(0.1);

  // Version check
  const versionRes = http.get(`${data.baseUrl}/version`, { headers });
  check(versionRes, {
    'version check status is 200': (r) => r.status === 200,
    'version check response time < 200ms': (r) => r.timings.duration < 200
  });
  requestDuration.add(versionRes.timings.duration);
  requestCount.add(1);
  errorRate.add(versionRes.status !== 200);

  sleep(0.1);

  // Check endpoint
  const checkPayload = JSON.stringify({
    code: 'function test() { return 1; }',
    category: 'general-code'
  });

  const checkRes = http.post(`${data.baseUrl}/check`, checkPayload, {
    headers,
    timeout: '10s'
  });
  check(checkRes, {
    'check endpoint status is 200': (r) => r.status === 200,
    'check endpoint response time < 500ms': (r) => r.timings.duration < 500,
    'check endpoint returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });
  requestDuration.add(checkRes.timings.duration);
  requestCount.add(1);
  errorRate.add(checkRes.status !== 200);

  sleep(0.1);

  // Judge endpoint
  const judgePayload = JSON.stringify({
    code: 'function test() { return 1; }',
    category: 'general-code'
  });

  const judgeRes = http.post(`${data.baseUrl}/judge`, judgePayload, {
    headers,
    timeout: '10s'
  });
  check(judgeRes, {
    'judge endpoint status is 200': (r) => r.status === 200,
    'judge endpoint response time < 1000ms': (r) => r.timings.duration < 1000,
    'judge endpoint returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });
  requestDuration.add(judgeRes.timings.duration);
  requestCount.add(1);
  errorRate.add(judgeRes.status !== 200);

  sleep(0.1);
}

// Ramp-up scenario
export function rampUp(data) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (data.apiKey) {
    headers['Authorization'] = `Bearer ${data.apiKey}`;
  }

  // Health check
  const healthRes = http.get(`${data.baseUrl}/health`, { headers });
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100
  });
  requestDuration.add(healthRes.timings.duration);
  requestCount.add(1);
  errorRate.add(healthRes.status !== 200);

  sleep(0.2);

  // Check endpoint
  const checkPayload = JSON.stringify({
    code: 'function test() { return 1; }',
    category: 'general-code'
  });

  const checkRes = http.post(`${data.baseUrl}/check`, checkPayload, {
    headers,
    timeout: '10s'
  });
  check(checkRes, {
    'check endpoint status is 200': (r) => r.status === 200,
    'check endpoint response time < 500ms': (r) => r.timings.duration < 500
  });
  requestDuration.add(checkRes.timings.duration);
  requestCount.add(1);
  errorRate.add(checkRes.status !== 200);

  sleep(0.2);
}

// Fixed iterations scenario
export function fixedIterations(data) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (data.apiKey) {
    headers['Authorization'] = `Bearer ${data.apiKey}`;
  }

  // Health check
  const healthRes = http.get(`${data.baseUrl}/health`, { headers });
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100
  });
  requestDuration.add(healthRes.timings.duration);
  requestCount.add(1);
  errorRate.add(healthRes.status !== 200);

  sleep(0.1);

  // Check endpoint
  const checkPayload = JSON.stringify({
    code: 'function test() { return 1; }',
    category: 'general-code'
  });

  const checkRes = http.post(`${data.baseUrl}/check`, checkPayload, {
    headers,
    timeout: '10s'
  });
  check(checkRes, {
    'check endpoint status is 200': (r) => r.status === 200,
    'check endpoint response time < 500ms': (r) => r.timings.duration < 500
  });
  requestDuration.add(checkRes.timings.duration);
  requestCount.add(1);
  errorRate.add(checkRes.status !== 200);

  sleep(0.1);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount.value}`);
  console.log(`Error rate: ${(errorRate.value * 100).toFixed(2)}%`);
  console.log(`Average request duration: ${requestDuration.avg.toFixed(2)}ms`);
}
