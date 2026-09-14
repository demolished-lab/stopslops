#!/usr/bin/env node
// PostgreSQL storage for production
import pg from 'pg';

const { Pool } = pg;

let pool = null;

// Initialize PostgreSQL connection pool
export function initPostgres(config = {}) {
  const {
    host = process.env.DB_HOST || 'localhost',
    port = process.env.DB_PORT || 5432,
    database = process.env.DB_NAME || 'antislop',
    user = process.env.DB_USER || 'antislop',
    password = process.env.DB_PASSWORD || 'antislop',
    max = 20,
    idleTimeoutMillis = 30000,
    connectionTimeoutMillis = 2000
  } = config;

  pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Create tables
export async function createTables() {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event VARCHAR(255) NOT NULL,
      severity VARCHAR(50),
      category VARCHAR(100),
      details JSONB,
      tenant_id VARCHAR(100),
      user_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS check_results (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_path TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      violations INTEGER DEFAULT 0,
      severity INTEGER DEFAULT 0,
      details JSONB,
      tenant_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      config JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metric_name VARCHAR(255) NOT NULL,
      metric_value DOUBLE PRECISION NOT NULL,
      labels JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      prefix VARCHAR(50),
      permissions JSONB DEFAULT '["read"]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used TIMESTAMPTZ,
      active BOOLEAN DEFAULT true
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event);
    CREATE INDEX IF NOT EXISTS idx_check_timestamp ON check_results(timestamp);
    CREATE INDEX IF NOT EXISTS idx_check_category ON check_results(category);
    CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
    CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
  `);
}

// Audit log operations
export async function insertAuditLog(log) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const result = await pool.query(
    `INSERT INTO audit_logs (timestamp, event, severity, category, details, tenant_id, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      log.timestamp || new Date().toISOString(),
      log.event,
      log.severity || 'info',
      log.category || null,
      log.details ? JSON.stringify(log.details) : null,
      log.tenantId || null,
      log.userId || null
    ]
  );

  return result.rows[0].id;
}

export async function queryAuditLogs(options = {}) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (options.startDate) {
    query += ` AND timestamp >= $${paramIndex++}`;
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ` AND timestamp <= $${paramIndex++}`;
    params.push(options.endDate);
  }

  if (options.event) {
    query += ` AND event = $${paramIndex++}`;
    params.push(options.event);
  }

  if (options.severity) {
    query += ` AND severity = $${paramIndex++}`;
    params.push(options.severity);
  }

  if (options.tenantId) {
    query += ` AND tenant_id = $${paramIndex++}`;
    params.push(options.tenantId);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

// Check results operations
export async function insertCheckResult(result) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const insertResult = await pool.query(
    `INSERT INTO check_results (timestamp, file_path, category, violations, severity, details, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      result.timestamp || new Date().toISOString(),
      result.filePath,
      result.category,
      result.violations || 0,
      result.severity || 0,
      result.details ? JSON.stringify(result.details) : null,
      result.tenantId || null
    ]
  );

  return insertResult.rows[0].id;
}

export async function queryCheckResults(options = {}) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  let query = 'SELECT * FROM check_results WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (options.startDate) {
    query += ` AND timestamp >= $${paramIndex++}`;
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ` AND timestamp <= $${paramIndex++}`;
    params.push(options.endDate);
  }

  if (options.category) {
    query += ` AND category = $${paramIndex++}`;
    params.push(options.category);
  }

  if (options.tenantId) {
    query += ` AND tenant_id = $${paramIndex++}`;
    params.push(options.tenantId);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

// Tenant operations
export async function insertTenant(tenant) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(
    `INSERT INTO tenants (id, name, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      tenant.id,
      tenant.name,
      tenant.config ? JSON.stringify(tenant.config) : null,
      tenant.createdAt || new Date().toISOString(),
      tenant.updatedAt || null
    ]
  );
}

export async function getTenant(id) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateTenant(id, updates) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(
    `UPDATE tenants SET name = $1, config = $2, updated_at = $3
     WHERE id = $4`,
    [
      updates.name,
      updates.config ? JSON.stringify(updates.config) : null,
      new Date().toISOString(),
      id
    ]
  );
}

// Metrics operations
export async function insertMetric(metric) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const result = await pool.query(
    `INSERT INTO metrics (timestamp, metric_name, metric_value, labels)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      metric.timestamp || new Date().toISOString(),
      metric.name,
      metric.value,
      metric.labels ? JSON.stringify(metric.labels) : null
    ]
  );

  return result.rows[0].id;
}

export async function queryMetrics(options = {}) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  let query = 'SELECT * FROM metrics WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (options.name) {
    query += ` AND metric_name = $${paramIndex++}`;
    params.push(options.name);
  }

  if (options.startDate) {
    query += ` AND timestamp >= $${paramIndex++}`;
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ` AND timestamp <= $${paramIndex++}`;
    params.push(options.endDate);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

// Aggregate metrics
export async function aggregateMetrics(name, startTime, endTime) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const result = await pool.query(
    `SELECT 
      COUNT(*) as count,
      AVG(metric_value) as avg,
      MIN(metric_value) as min,
      MAX(metric_value) as max,
      SUM(metric_value) as sum
    FROM metrics
    WHERE metric_name = $1
      AND timestamp >= $2
      AND timestamp <= $3`,
    [name, startTime, endTime]
  );

  return result.rows[0];
}

// API Key operations
export async function insertApiKey(key) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(
    `INSERT INTO api_keys (id, name, key_hash, prefix, permissions, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      key.id,
      key.name,
      key.keyHash,
      key.prefix,
      JSON.stringify(key.permissions),
      key.createdAt || new Date().toISOString()
    ]
  );
}

export async function getApiKey(keyHash) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  const result = await pool.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND active = true',
    [keyHash]
  );
  return result.rows[0] || null;
}

export async function updateApiKeyLastUsed(keyId) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(
    'UPDATE api_keys SET last_used = $1 WHERE id = $2',
    [new Date().toISOString(), keyId]
  );
}

export async function revokeApiKey(keyId) {
  if (!pool) throw new Error('PostgreSQL not initialized');

  await pool.query(
    'UPDATE api_keys SET active = false WHERE id = $1',
    [keyId]
  );
}

// Get pool status
export async function getPoolStatus() {
  if (!pool) throw new Error('PostgreSQL not initialized');

  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

// Close pool
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      initPostgres();
      await createTables();
      console.log('PostgreSQL initialized');
      break;

    case 'status':
      initPostgres();
      const status = await getPoolStatus();
      console.log('Pool Status:', status);
      break;

    default:
      console.log('PostgreSQL Storage');
      console.log('');
      console.log('Commands:');
      console.log('  init      Initialize database');
      console.log('  status    Show pool status');
  }

  await closePool();
}
