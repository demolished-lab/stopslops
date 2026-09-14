#!/usr/bin/env node
// Health check endpoint for enterprise monitoring
// Usage: node health.mjs [--port 3000]
// Returns JSON health status for load balancers and monitoring systems

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMetrics } from './logger.mjs';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const PORT = parseInt(process.argv.find((_, i, a) => a[i-1] === '--port') || '3000');

async function getHealthStatus() {
  const startTime = Date.now();
  
  // Check critical files
  const checks = {
    registry: false,
    antislop: false,
    scripts: false,
    skills: false,
    checkers: false,
    judge: false
  };
  
  try {
    await readFile(join(ROOT, 'registry.json'), 'utf8');
    checks.registry = true;
  } catch {}
  
  try {
    await readFile(join(ROOT, 'antislop.md'), 'utf8');
    checks.antislop = true;
  } catch {}
  
  try {
    const { readdirSync } = await import('node:fs');
    const scripts = readdirSync(join(ROOT, 'scripts'));
    checks.scripts = scripts.length > 0;
  } catch {}
  
  try {
    const { readdirSync } = await import('node:fs');
    const skills = readdirSync(join(ROOT, 'skills'));
    checks.skills = skills.length > 0;
  } catch {}
  
  try {
    const { readdirSync } = await import('node:fs');
    const checkers = readdirSync(join(ROOT, 'checkers'));
    checks.checkers = checkers.length > 0;
  } catch {}
  
  try {
    const { existsSync } = await import('node:fs');
    checks.judge = existsSync(join(ROOT, 'judge/rubric.json'));
  } catch {}
  
  const allHealthy = Object.values(checks).every(v => v);
  const metrics = getMetrics();
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    checks,
    metrics: {
      totalChecks: metrics.checks.total,
      passedChecks: metrics.checks.passed,
      failedChecks: metrics.checks.failed,
      totalJudges: metrics.judges.total,
      passedJudges: metrics.judges.passed,
      failedJudges: metrics.judges.failed
    },
    responseTime: Date.now() - startTime
  };
}

const server = createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    try {
      const health = await getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2));
    }
  } else if (req.url === '/ready') {
    // Readiness probe for Kubernetes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ready: true }));
  } else if (req.url === '/live') {
    // Liveness probe for Kubernetes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ alive: true }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Health check server running on http://localhost:${PORT}`);
  console.log(`  GET /health  - Full health status`);
  console.log(`  GET /ready   - Readiness probe`);
  console.log(`  GET /live    - Liveness probe`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down health server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down health server...');
  server.close(() => process.exit(0));
});
