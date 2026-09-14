#!/usr/bin/env node
// JWT/OAuth authentication for production
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

// Token storage (in production, use Redis)
const refreshTokens = new Map();

// Generate access token
export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'universal-antislop',
    audience: 'antislop-api'
  });
}

// Generate refresh token
export function generateRefreshToken(payload) {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'universal-antislop',
    audience: 'antislop-api'
  });

  refreshTokens.set(token, {
    userId: payload.userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  return token;
}

// Verify access token
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'universal-antislop',
      audience: 'antislop-api'
    });
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'universal-antislop',
      audience: 'antislop-api'
    });

    if (!refreshTokens.has(token)) {
      return { valid: false, error: 'Refresh token not found' };
    }

    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Revoke refresh token
export function revokeRefreshToken(token) {
  refreshTokens.delete(token);
}

// Revoke all refresh tokens for user
export function revokeAllRefreshTokens(userId) {
  for (const [token, data] of refreshTokens.entries()) {
    if (data.userId === userId) {
      refreshTokens.delete(token);
    }
  }
}

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate API key
export function generateApiKey(prefix = 'antislop') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

// Hash API key for storage
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate user ID
export function generateUserId() {
  return crypto.randomUUID();
}

// Authentication middleware for HTTP
export function authMiddleware(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No authorization header' }));
      return;
    }

    const [type, token] = authHeader.split(' ');

    if (type === 'Bearer') {
      // JWT token
      const result = verifyAccessToken(token);
      if (!result.valid) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token', details: result.error }));
        return;
      }
      req.user = result.decoded;
    } else if (type === 'ApiKey') {
      // API key
      const apiKeyHash = hashApiKey(token);
      req.user = { type: 'api-key', hash: apiKeyHash };
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid authorization type' }));
      return;
    }

    return handler(req, res);
  };
}

// Role-based access control
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    if (!req.user.roles || !req.user.roles.some(role => roles.includes(role))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Insufficient permissions' }));
      return;
    }

    next();
  };
}

// Permission-based access control
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    if (!req.user.permissions || !req.user.permissions.some(perm => permissions.includes(perm))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Insufficient permissions' }));
      return;
    }

    next();
  };
}

// Rate limiting with Redis
export function rateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    keyGenerator = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const timestamps = requests.get(key).filter(t => t > now - windowMs);
    timestamps.push(now);
    requests.set(key, timestamps);

    if (timestamps.length > max) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - timestamps.length));
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();
  };
}

// CORS middleware
export function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400
  } = options;

  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', maxAge);

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}

// Login endpoint
export async function login(username, password, userStore) {
  const user = await userStore.findByUsername(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: 'Invalid password' };
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    username: user.username,
    roles: user.roles || [],
    permissions: user.permissions || []
  });

  const refreshToken = generateRefreshToken({
    userId: user.id
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  };
}

// Refresh token endpoint
export async function refresh(refreshToken) {
  const result = verifyRefreshToken(refreshToken);
  if (!result.valid) {
    return { success: false, error: result.error };
  }

  const newAccessToken = generateAccessToken({
    userId: result.decoded.userId,
    username: result.decoded.username,
    roles: result.decoded.roles || [],
    permissions: result.decoded.permissions || []
  });

  return {
    success: true,
    accessToken: newAccessToken,
    expiresIn: JWT_EXPIRES_IN
  };
}

// Logout endpoint
export function logout(refreshToken) {
  revokeRefreshToken(refreshToken);
  return { success: true };
}

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];

  switch (command) {
    case 'generate-key':
      const key = generateApiKey();
      console.log('API Key:', key);
      console.log('Hash:', hashApiKey(key));
      break;

    case 'verify-token':
      const token = process.argv[3];
      if (!token) {
        console.error('Usage: jwt-auth.mjs verify-token <token>');
        process.exit(1);
      }
      const result = verifyAccessToken(token);
      console.log('Valid:', result.valid);
      if (result.valid) {
        console.log('Decoded:', result.decoded);
      } else {
        console.log('Error:', result.error);
      }
      break;

    default:
      console.log('JWT Authentication');
      console.log('');
      console.log('Commands:');
      console.log('  generate-key    Generate API key');
      console.log('  verify-token    Verify JWT token');
  }
}
