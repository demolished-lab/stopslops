// Multi-tenant support: isolated environments per organization
// Enterprise requirement: tenant isolation, per-tenant config, usage tracking

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const TENANTS_DIR = join(ROOT, 'tenants');

export class TenantManager {
  constructor() {
    this.tenants = new Map();
    this.initialized = false;
  }
  
  async init() {
    if (!existsSync(TENANTS_DIR)) {
      await mkdir(TENANTS_DIR, { recursive: true });
    }
    
    // Load existing tenants
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(TENANTS_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const tenantId = file.replace('.json', '');
        const config = await this.loadTenantConfig(tenantId);
        if (config) {
          this.tenants.set(tenantId, config);
        }
      }
    }
    
    this.initialized = true;
    return this;
  }
  
  async loadTenantConfig(tenantId) {
    const configFile = join(TENANTS_DIR, `${tenantId}.json`);
    if (!existsSync(configFile)) return null;
    
    try {
      const content = await readFile(configFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  async saveTenantConfig(tenantId, config) {
    const configFile = join(TENANTS_DIR, `${tenantId}.json`);
    await writeFile(configFile, JSON.stringify(config, null, 2));
    this.tenants.set(tenantId, config);
  }
  
  async createTenant(name, options = {}) {
    const tenantId = this.generateTenantId(name);
    
    if (this.tenants.has(tenantId)) {
      throw new Error(`Tenant ${tenantId} already exists`);
    }
    
    const config = {
      id: tenantId,
      name,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy || 'system',
      
      // Isolation settings
      isolation: {
        level: options.isolationLevel || 'standard', // standard, strict, maximum
        separateCache: options.separateCache || false,
        separateLogs: options.separateLogs || false
      },
      
      // Rate limits (per tenant)
      rateLimit: {
        requestsPerMinute: options.requestsPerMinute || 100,
        requestsPerHour: options.requestsPerHour || 1000,
        requestsPerDay: options.requestsPerDay || 10000
      },
      
      // Feature flags
      features: {
        llmJudge: options.llmJudge !== false,
        customCheckers: options.customCheckers || false,
        apiAccess: options.apiAccess !== false,
        healthChecks: options.healthChecks !== false
      },
      
      // Security settings
      security: {
        ipWhitelist: options.ipWhitelist || [],
        apiKeyRequired: options.apiKeyRequired || false,
        auditLogging: options.auditLogging !== false
      },
      
      // Usage tracking
      usage: {
        totalChecks: 0,
        totalJudges: 0,
        totalApiCalls: 0,
        lastActivity: null
      },
      
      // Custom configuration
      custom: options.custom || {}
    };
    
    await this.saveTenantConfig(tenantId, config);
    return config;
  }
  
  async getTenant(tenantId) {
    return this.tenants.get(tenantId) || null;
  }
  
  async updateTenant(tenantId, updates) {
    const config = this.tenants.get(tenantId);
    if (!config) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    
    const updated = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveTenantConfig(tenantId, updated);
    return updated;
  }
  
  async deleteTenant(tenantId) {
    if (!this.tenants.has(tenantId)) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    
    this.tenants.delete(tenantId);
    
    const configFile = join(TENANTS_DIR, `${tenantId}.json`);
    if (existsSync(configFile)) {
      const { unlinkSync } = await import('node:fs');
      unlinkSync(configFile);
    }
    
    return true;
  }
  
  async listTenants() {
    return Array.from(this.tenants.values());
  }
  
  async trackUsage(tenantId, eventType) {
    const config = this.tenants.get(tenantId);
    if (!config) return false;
    
    config.usage.totalChecks++;
    config.usage.lastActivity = new Date().toISOString();
    
    if (eventType === 'judge') {
      config.usage.totalJudges++;
    } else if (eventType === 'api') {
      config.usage.totalApiCalls++;
    }
    
    await this.saveTenantConfig(tenantId, config);
    return true;
  }
  
  async checkRateLimit(tenantId) {
    const config = this.tenants.get(tenantId);
    if (!config) return { allowed: false, reason: 'tenant_not_found' };
    
    // Simple rate limiting based on usage counters
    // In production, use Redis or similar for accurate tracking
    const usage = config.usage;
    const limits = config.rateLimit;
    
    if (usage.totalChecks >= limits.requestsPerDay) {
      return { allowed: false, reason: 'daily_limit_exceeded', limit: limits.requestsPerDay };
    }
    
    return { allowed: true, remaining: limits.requestsPerDay - usage.totalChecks };
  }
  
  generateTenantId(name) {
    const hash = createHash('sha256')
      .update(name + Date.now().toString())
      .digest('hex')
      .slice(0, 8);
    return `tenant_${hash}`;
  }
  
  // Get isolated cache directory for tenant
  getCacheDir(tenantId) {
    const config = this.tenants.get(tenantId);
    if (config?.isolation?.separateCache) {
      return join(ROOT, '.cache', 'antislop', tenantId);
    }
    return join(ROOT, '.cache', 'antislop');
  }
  
  // Get isolated log directory for tenant
  getLogDir(tenantId) {
    const config = this.tenants.get(tenantId);
    if (config?.isolation?.separateLogs) {
      return join(ROOT, 'audit-logs', tenantId);
    }
    return join(ROOT, 'audit-logs');
  }
}

export default TenantManager;
