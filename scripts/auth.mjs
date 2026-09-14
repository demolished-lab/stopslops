#!/usr/bin/env node
// API Key authentication middleware
import crypto from 'crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const KEYS_DIR = join(ROOT, '.keys');
const KEYS_FILE = join(KEYS_DIR, 'api-keys.json');

// Initialize keys directory
async function initKeysDir() {
  if (!existsSync(KEYS_DIR)) {
    await mkdir(KEYS_DIR, { recursive: true });
  }
}

// Load API keys
async function loadKeys() {
  await initKeysDir();
  if (!existsSync(KEYS_FILE)) {
    const defaultKeys = { keys: [] };
    await writeFile(KEYS_FILE, JSON.stringify(defaultKeys, null, 2));
    return defaultKeys;
  }
  const content = await readFile(KEYS_FILE, 'utf8');
  return JSON.parse(content);
}

// Save API keys
async function saveKeys(keys) {
  await initKeysDir();
  await writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// Generate API key
export function generateApiKey(prefix = 'antislop') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

// Hash API key for storage
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Create new API key
export async function createApiKey(name, permissions = ['read', 'write']) {
  const keys = await loadKeys();
  const key = generateApiKey();
  const hashedKey = hashApiKey(key);
  
  const keyEntry = {
    id: crypto.randomUUID(),
    name,
    key: hashedKey,
    prefix: key.substring(0, 20) + '...',
    permissions,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    active: true
  };
  
  keys.keys.push(keyEntry);
  await saveKeys(keys);
  
  return {
    id: keyEntry.id,
    key, // Return full key only on creation
    name: keyEntry.name,
    permissions: keyEntry.permissions,
    createdAt: keyEntry.createdAt
  };
}

// Validate API key
export async function validateApiKey(key) {
  if (!key) return { valid: false, error: 'No API key provided' };
  
  const keys = await loadKeys();
  const hashedKey = hashApiKey(key);
  
  const keyEntry = keys.keys.find(k => k.key === hashedKey && k.active);
  if (!keyEntry) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Update last used
  keyEntry.lastUsed = new Date().toISOString();
  await saveKeys(keys);
  
  return {
    valid: true,
    id: keyEntry.id,
    name: keyEntry.name,
    permissions: keyEntry.permissions
  };
}

// Revoke API key
export async function revokeApiKey(keyId) {
  const keys = await loadKeys();
  const keyIndex = keys.keys.findIndex(k => k.id === keyId);
  
  if (keyIndex === -1) {
    return { success: false, error: 'Key not found' };
  }
  
  keys.keys[keyIndex].active = false;
  await saveKeys(keys);
  
  return { success: true };
}

// List API keys (without showing full keys)
export async function listApiKeys() {
  const keys = await loadKeys();
  return keys.keys.map(k => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    permissions: k.permissions,
    createdAt: k.createdAt,
    lastUsed: k.lastUsed,
    active: k.active
  }));
}

// Authentication middleware for HTTP
export function authMiddleware(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid Authorization header' }));
      return;
    }
    
    const token = authHeader.substring(7);
    const validation = await validateApiKey(token);
    
    if (!validation.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: validation.error }));
      return;
    }
    
    // Add user info to request
    req.user = {
      id: validation.id,
      name: validation.name,
      permissions: validation.permissions
    };
    
    return handler(req, res);
  };
}

// Check permission
export function hasPermission(user, permission) {
  return user && user.permissions && user.permissions.includes(permission);
}

// CLI for managing API keys
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      const name = process.argv[3] || 'default';
      const result = await createApiKey(name);
      console.log('API Key created:');
      console.log(`  ID: ${result.id}`);
      console.log(`  Key: ${result.key}`);
      console.log(`  Name: ${result.name}`);
      console.log(`  Permissions: ${result.permissions.join(', ')}`);
      console.log('\nSave this key - it won\'t be shown again!');
      break;
      
    case 'list':
      const keyList = await listApiKeys();
      console.log('API Keys:');
      for (const k of keyList) {
        console.log(`  ${k.name} (${k.prefix}) - ${k.active ? 'active' : 'revoked'}`);
      }
      break;
      
    case 'revoke':
      const keyId = process.argv[3];
      if (!keyId) {
        console.error('Usage: auth.mjs revoke <key-id>');
        process.exit(1);
      }
      const revokeResult = await revokeApiKey(keyId);
      if (revokeResult.success) {
        console.log('Key revoked successfully');
      } else {
        console.error('Failed to revoke key:', revokeResult.error);
      }
      break;
      
    default:
      console.log('API Key Management');
      console.log('');
      console.log('Commands:');
      console.log('  create [name]    Create a new API key');
      console.log('  list             List all API keys');
      console.log('  revoke <id>      Revoke an API key');
  }
}
