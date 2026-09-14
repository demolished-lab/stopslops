#!/usr/bin/env node
// REST API with versioning for enterprise integration
// Usage: node api.mjs [--port 3000] [--version v1]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMetrics } from './logger.mjs';
import { TenantManager } from './tenant.mjs';
import { audit, AuditEvent, Severity } from './audit-logger.mjs';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const PORT = parseInt(process.argv.find((_, i, a) => a[i-1] === '--port') || '3000');
const API_VERSION = process.argv.find((_, i, a) => a[i-1] === '--version') || 'v1';

// Initialize tenant manager
const tenantManager = await new TenantManager().init();

// API version registry
const apiVersions = {
  v1: {
    version: '1.0.0',
    status: 'stable',
    deprecated: false,
    sunset: null
  },
  v2: {
    version: '2.0.0',
    status: 'beta',
    deprecated: false,
    sunset: null
  }
};

// Request ID generator
let requestCounter = 0;
function generateRequestId() {
  return `req_${Date.now()}_${++requestCounter}`;
}

// Parse request body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// CORS headers
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-API-Version');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// JSON response
function jsonResponse(res, status, data) {
  setCORS(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Error response
function errorResponse(res, status, message, details = {}) {
  jsonResponse(res, status, {
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      ...details
    }
  });
}

// Version check middleware
function checkVersion(req) {
  const requestedVersion = req.headers['x-api-version'] || API_VERSION;
  const versionInfo = apiVersions[requestedVersion];
  
  if (!versionInfo) {
    return { valid: false, error: `Unknown API version: ${requestedVersion}` };
  }
  
  if (versionInfo.deprecated) {
    return { valid: true, warning: `API version ${requestedVersion} is deprecated. Sunset: ${versionInfo.sunset}` };
  }
  
  return { valid: true, version: requestedVersion };
}

// Tenant check middleware
async function checkTenant(req) {
  const tenantId = req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return { valid: false, error: 'X-Tenant-ID header required' };
  }
  
  const tenant = await tenantManager.getTenant(tenantId);
  if (!tenant) {
    return { valid: false, error: `Tenant ${tenantId} not found` };
  }
  
  // Check rate limit
  const rateLimit = await tenantManager.checkRateLimit(tenantId);
  if (!rateLimit.allowed) {
    return { valid: false, error: `Rate limit exceeded: ${rateLimit.reason}` };
  }
  
  return { valid: true, tenant, remaining: rateLimit.remaining };
}

// API routes
const routes = {
  // Health endpoints
  'GET /health': async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      api: {
        versions: apiVersions,
        current: API_VERSION
      }
    };
    
    jsonResponse(res, 200, health);
  },
  
  // Tenant management
  'POST /tenants': async (req, res) => {
    try {
      const body = await parseBody(req);
      const tenant = await tenantManager.createTenant(body.name, body);
      
      await audit(AuditEvent.USER_ACTION, {
        action: 'tenant.create',
        tenantId: tenant.id,
        severity: Severity.INFO
      });
      
      jsonResponse(res, 201, { tenant });
    } catch (e) {
      errorResponse(res, 400, e.message);
    }
  },
  
  'GET /tenants': async (req, res) => {
    const tenants = await tenantManager.listTenants();
    jsonResponse(res, 200, { tenants });
  },
  
  'GET /tenants/:id': async (req, res) => {
    const tenant = await tenantManager.getTenant(req.params.id);
    if (!tenant) {
      return errorResponse(res, 404, 'Tenant not found');
    }
    jsonResponse(res, 200, { tenant });
  },
  
  // Checker endpoints
  'POST /check': async (req, res) => {
    const tenantCheck = await checkTenant(req);
    if (!tenantCheck.valid) {
      return errorResponse(res, 403, tenantCheck.error);
    }
    
    try {
      const body = await parseBody(req);
      const { execSync } = await import('node:child_process');
      
      const result = execSync('node ./scripts/run-checkers.mjs', {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 30000
      });
      
      await tenantManager.trackUsage(tenantCheck.tenant.id, 'api');
      await audit(AuditEvent.USER_ACTION, {
        action: 'check.run',
        tenantId: tenantCheck.tenant.id,
        severity: Severity.INFO
      });
      
      jsonResponse(res, 200, {
        result: result.trim(),
        remaining: tenantCheck.remaining
      });
    } catch (e) {
      errorResponse(res, 500, e.message);
    }
  },
  
  // Judge endpoints
  'POST /judge': async (req, res) => {
    const tenantCheck = await checkTenant(req);
    if (!tenantCheck.valid) {
      return errorResponse(res, 403, tenantCheck.error);
    }
    
    try {
      const body = await parseBody(req);
      const { execSync } = await import('node:child_process');
      
      const result = execSync(
        `node ./scripts/judge.mjs --category ${body.category || 'general-code'} --file "${body.file}"`,
        {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 30000
        }
      );
      
      await tenantManager.trackUsage(tenantCheck.tenant.id, 'judge');
      await audit(AuditEvent.JUDGE_RUN, {
        tenantId: tenantCheck.tenant.id,
        category: body.category,
        severity: Severity.INFO
      });
      
      jsonResponse(res, 200, {
        result: JSON.parse(result),
        remaining: tenantCheck.remaining
      });
    } catch (e) {
      errorResponse(res, 500, e.message);
    }
  },
  
  // Metrics endpoint
  'GET /metrics': async (req, res) => {
    const metrics = getMetrics();
    jsonResponse(res, 200, { metrics });
  },
  
  // API version info
  'GET /version': async (req, res) => {
    jsonResponse(res, 200, {
      current: API_VERSION,
      versions: apiVersions
    });
  }
};

// Request router
async function handleRequest(req, res) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  // Add request ID to response
  res.setHeader('X-Request-ID', requestId);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS(res);
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Version check
  const versionCheck = checkVersion(req);
  if (!versionCheck.valid) {
    return errorResponse(res, 400, versionCheck.error);
  }
  
  if (versionCheck.warning) {
    res.setHeader('X-API-Deprecation-Warning', versionCheck.warning);
  }
  
  // Route matching
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;
  
  // Try exact match first
  const routeKey = `${method} ${path}`;
  if (routes[routeKey]) {
    try {
      await routes[routeKey](req, res);
    } catch (e) {
      await audit(AuditEvent.SYSTEM_ERROR, {
        requestId,
        error: e.message,
        severity: Severity.ERROR
      });
      errorResponse(res, 500, 'Internal server error');
    }
    return;
  }
  
  // Try parameterized routes
  for (const [pattern, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    
    if (routeMethod !== method) continue;
    
    // Convert /tenants/:id to regex
    const regex = new RegExp('^' + routePath.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    const match = path.match(regex);
    
    if (match) {
      req.params = match.groups || {};
      try {
        await handler(req, res);
      } catch (e) {
        await audit(AuditEvent.SYSTEM_ERROR, {
          requestId,
          error: e.message,
          severity: Severity.ERROR
        });
        errorResponse(res, 500, 'Internal server error');
      }
      return;
    }
  }
  
  // 404
  errorResponse(res, 404, 'Endpoint not found');
}

// Create server
const server = createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (e) {
    console.error('Unhandled error:', e);
    errorResponse(res, 500, 'Internal server error');
  }
});

// Start server
server.listen(PORT, async () => {
  console.log(`Universal Anti-Slop API running on http://localhost:${PORT}`);
  console.log(`  API Version: ${API_VERSION}`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /health      - Health check`);
  console.log(`    GET  /version     - API version info`);
  console.log(`    GET  /metrics     - System metrics`);
  console.log(`    POST /check       - Run checkers`);
  console.log(`    POST /judge       - Run judge`);
  console.log(`    POST /tenants     - Create tenant`);
  console.log(`    GET  /tenants     - List tenants`);
  console.log(`    GET  /tenants/:id - Get tenant`);
  
  await audit(AuditEvent.SYSTEM_START, {
    port: PORT,
    version: API_VERSION,
    severity: Severity.INFO
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down API server...');
  await audit(AuditEvent.SYSTEM_STOP, { severity: Severity.INFO });
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('Shutting down API server...');
  await audit(AuditEvent.SYSTEM_STOP, { severity: Severity.INFO });
  server.close(() => process.exit(0));
});

export default server;
