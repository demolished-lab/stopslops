#!/usr/bin/env node
// Persistent storage with JSON files
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const DATA_DIR = join(ROOT, '.data');

let data = {
  auditLogs: [],
  checkResults: [],
  tenants: [],
  metrics: []
};

// Initialize storage
export async function initStorage() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  
  const dataFile = join(DATA_DIR, 'data.json');
  if (existsSync(dataFile)) {
    const content = await readFile(dataFile, 'utf-8');
    data = JSON.parse(content);
  } else {
    await saveData();
  }
}

// Save data to file
async function saveData() {
  const dataFile = join(DATA_DIR, 'data.json');
  await writeFile(dataFile, JSON.stringify(data, null, 2));
}

// Audit log operations
export async function insertAuditLog(log) {
  data.auditLogs.push({
    id: data.auditLogs.length + 1,
    timestamp: log.timestamp || new Date().toISOString(),
    event: log.event,
    severity: log.severity || 'info',
    category: log.category || null,
    details: log.details || null,
    tenantId: log.tenantId || null,
    userId: log.userId || null
  });
  await saveData();
}

export async function queryAuditLogs(options = {}) {
  let results = [...data.auditLogs];
  
  if (options.startDate) {
    results = results.filter(log => log.timestamp >= options.startDate);
  }
  
  if (options.endDate) {
    results = results.filter(log => log.timestamp <= options.endDate);
  }
  
  if (options.event) {
    results = results.filter(log => log.event === options.event);
  }
  
  if (options.severity) {
    results = results.filter(log => log.severity === options.severity);
  }
  
  if (options.tenantId) {
    results = results.filter(log => log.tenantId === options.tenantId);
  }
  
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  if (options.limit) {
    results = results.slice(0, options.limit);
  }
  
  return results;
}

// Check results operations
export async function insertCheckResult(result) {
  data.checkResults.push({
    id: data.checkResults.length + 1,
    timestamp: result.timestamp || new Date().toISOString(),
    filePath: result.filePath,
    category: result.category,
    violations: result.violations || 0,
    severity: result.severity || 0,
    details: result.details || null,
    tenantId: result.tenantId || null
  });
  await saveData();
}

export async function queryCheckResults(options = {}) {
  let results = [...data.checkResults];
  
  if (options.startDate) {
    results = results.filter(r => r.timestamp >= options.startDate);
  }
  
  if (options.endDate) {
    results = results.filter(r => r.timestamp <= options.endDate);
  }
  
  if (options.category) {
    results = results.filter(r => r.category === options.category);
  }
  
  if (options.tenantId) {
    results = results.filter(r => r.tenantId === options.tenantId);
  }
  
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  if (options.limit) {
    results = results.slice(0, options.limit);
  }
  
  return results;
}

// Tenant operations
export async function insertTenant(tenant) {
  data.tenants.push({
    id: tenant.id,
    name: tenant.name,
    config: tenant.config || null,
    createdAt: tenant.createdAt || new Date().toISOString(),
    updatedAt: tenant.updatedAt || null
  });
  await saveData();
}

export async function getTenant(id) {
  return data.tenants.find(t => t.id === id) || null;
}

export async function updateTenant(id, updates) {
  const index = data.tenants.findIndex(t => t.id === id);
  if (index !== -1) {
    data.tenants[index] = {
      ...data.tenants[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await saveData();
  }
}

// Metrics operations
export async function insertMetric(metric) {
  data.metrics.push({
    id: data.metrics.length + 1,
    timestamp: metric.timestamp || new Date().toISOString(),
    name: metric.name,
    value: metric.value,
    labels: metric.labels || null
  });
  await saveData();
}

export async function queryMetrics(options = {}) {
  let results = [...data.metrics];
  
  if (options.name) {
    results = results.filter(m => m.name === options.name);
  }
  
  if (options.startDate) {
    results = results.filter(m => m.timestamp >= options.startDate);
  }
  
  if (options.endDate) {
    results = results.filter(m => m.timestamp <= options.endDate);
  }
  
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  if (options.limit) {
    results = results.slice(0, options.limit);
  }
  
  return results;
}

// Aggregate metrics
export async function aggregateMetrics(name, startTime, endTime) {
  const filtered = data.metrics.filter(m => 
    m.name === name && 
    m.timestamp >= startTime && 
    m.timestamp <= endTime
  );
  
  if (filtered.length === 0) {
    return { count: 0, avg: 0, min: 0, max: 0, sum: 0 };
  }
  
  const values = filtered.map(m => m.value);
  return {
    count: values.length,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    sum: values.reduce((a, b) => a + b, 0)
  };
}

// Get statistics
export async function getStats() {
  return {
    auditLogs: data.auditLogs.length,
    checkResults: data.checkResults.length,
    tenants: data.tenants.length,
    metrics: data.metrics.length
  };
}

// CLI for storage management
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      await initStorage();
      console.log('Storage initialized');
      break;
      
    case 'stats':
      await initStorage();
      const stats = await getStats();
      console.log('Storage Statistics:');
      console.log(`  Audit Logs: ${stats.auditLogs}`);
      console.log(`  Check Results: ${stats.checkResults}`);
      console.log(`  Tenants: ${stats.tenants}`);
      console.log(`  Metrics: ${stats.metrics}`);
      break;
      
    default:
      console.log('Storage Management');
      console.log('');
      console.log('Commands:');
      console.log('  init      Initialize storage');
      console.log('  stats     Show storage statistics');
  }
}
