#!/usr/bin/env node
// Redis caching for production
import Redis from 'ioredis';

let client = null;

// Initialize Redis connection
export function initRedis(config = {}) {
  const {
    host = process.env.REDIS_HOST || 'localhost',
    port = process.env.REDIS_PORT || 6379,
    password = process.env.REDIS_PASSWORD || null,
    db = process.env.REDIS_DB || 0,
    keyPrefix = process.env.REDIS_PREFIX || 'antislop:',
    maxRetriesPerRequest = 3,
    retryDelayOnFailover = 100
  } = config;

  client = new Redis({
    host,
    port,
    password,
    db,
    keyPrefix,
    maxRetriesPerRequest,
    retryDelayOnFailover,
    enableReadyCheck: true,
    lazyConnect: true
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client;
}

// Get client instance
export function getClient() {
  if (!client) {
    throw new Error('Redis not initialized');
  }
  return client;
}

// Cache operations
export async function cacheGet(key) {
  if (!client) throw new Error('Redis not initialized');
  const value = await client.get(key);
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return null;
}

export async function cacheSet(key, value, ttl = 3600) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttl) {
    await client.setex(key, ttl, serialized);
  } else {
    await client.set(key, serialized);
  }
}

export async function cacheDel(key) {
  if (!client) throw new Error('Redis not initialized');
  await client.del(key);
}

export async function cacheExists(key) {
  if (!client) throw new Error('Redis not initialized');
  return await client.exists(key);
}

export async function cacheTTL(key) {
  if (!client) throw new Error('Redis not initialized');
  return await client.ttl(key);
}

// Hash operations
export async function hashGet(key, field) {
  if (!client) throw new Error('Redis not initialized');
  const value = await client.hget(key, field);
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return null;
}

export async function hashSet(key, field, value, ttl = 3600) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await client.hset(key, field, serialized);
  if (ttl) {
    await client.expire(key, ttl);
  }
}

export async function hashGetAll(key) {
  if (!client) throw new Error('Redis not initialized');
  const result = await client.hgetall(key);
  const parsed = {};
  for (const [field, value] of Object.entries(result)) {
    try {
      parsed[field] = JSON.parse(value);
    } catch {
      parsed[field] = value;
    }
  }
  return parsed;
}

// List operations
export async function listPush(key, value, ttl = 3600) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await client.rpush(key, serialized);
  if (ttl) {
    await client.expire(key, ttl);
  }
}

export async function listPop(key) {
  if (!client) throw new Error('Redis not initialized');
  const value = await client.lpop(key);
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return null;
}

export async function listRange(key, start = 0, end = -1) {
  if (!client) throw new Error('Redis not initialized');
  const values = await client.lrange(key, start, end);
  return values.map(v => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  });
}

// Set operations
export async function setAdd(key, value, ttl = 3600) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await client.sadd(key, serialized);
  if (ttl) {
    await client.expire(key, ttl);
  }
}

export async function setMembers(key) {
  if (!client) throw new Error('Redis not initialized');
  const values = await client.smembers(key);
  return values.map(v => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  });
}

export async function setIsMember(key, value) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return await client.sismember(key, serialized);
}

// Sorted set operations
export async function zsetAdd(key, score, value, ttl = 3600) {
  if (!client) throw new Error('Redis not initialized');
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await client.zadd(key, score, serialized);
  if (ttl) {
    await client.expire(key, ttl);
  }
}

export async function zsetRange(key, start = 0, end = -1) {
  if (!client) throw new Error('Redis not initialized');
  const values = await client.zrange(key, start, end, 'WITHSCORES');
  const result = [];
  for (let i = 0; i < values.length; i += 2) {
    try {
      result.push({ value: JSON.parse(values[i]), score: parseFloat(values[i + 1]) });
    } catch {
      result.push({ value: values[i], score: parseFloat(values[i + 1]) });
    }
  }
  return result;
}

// Rate limiting
export async function rateLimit(key, limit, window) {
  if (!client) throw new Error('Redis not initialized');

  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, window);
  }

  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
    reset: Date.now() + (await client.ttl(key)) * 1000
  };
}

// Health check
export async function healthCheck() {
  if (!client) throw new Error('Redis not initialized');

  try {
    const pong = await client.ping();
    return {
      status: 'healthy',
      latency: Date.now(),
      connected: client.status === 'ready'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connected: false
    };
  }
}

// Get stats
export async function getStats() {
  if (!client) throw new Error('Redis not initialized');

  const info = await client.info('memory');
  const keyspace = await client.info('keyspace');

  return {
    memory: info,
    keyspace
  };
}

// Close connection
export async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];

  switch (command) {
    case 'connect':
      initRedis();
      console.log('Redis connected');
      break;

    case 'health':
      initRedis();
      const health = await healthCheck();
      console.log('Health:', health);
      break;

    case 'stats':
      initRedis();
      const stats = await getStats();
      console.log('Stats:', stats);
      break;

    default:
      console.log('Redis Cache');
      console.log('');
      console.log('Commands:');
      console.log('  connect   Connect to Redis');
      console.log('  health    Health check');
      console.log('  stats     Show stats');
  }

  await closeRedis();
}
