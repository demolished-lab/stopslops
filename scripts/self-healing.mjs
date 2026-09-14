#!/usr/bin/env node
// Self-Healing - Auto-recover from failures
import { getRLM } from './rlm-engine.mjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const HEALING_STRATEGIES = {
  // Retry strategies
  RETRY: {
    IMMEDIATE: { name: 'retry-immediate', delay: 0, maxAttempts: 3 },
    EXPONENTIAL: { name: 'retry-exponential', delay: 1000, maxAttempts: 3, backoff: 2 },
    LINEAR: { name: 'retry-linear', delay: 1000, maxAttempts: 3, increment: 500 }
  },
  // Fallback strategies
  FALLBACK: {
    DEFAULT: { name: 'fallback-default', useDefault: true },
    CACHE: { name: 'fallback-cache', useCache: true },
    CIRCUIT_BREAKER: { name: 'fallback-circuit-breaker', threshold: 5 }
  },
  // Recovery strategies
  RECOVERY: {
    RESTART: { name: 'recovery-restart', graceful: true },
    RESET: { name: 'recovery-reset', clearState: true },
    ISOLATE: { name: 'recovery-isolate', isolateComponent: true }
  },
  // Adaptation strategies
  ADAPTATION: {
    DEGRADE: { name: 'adaptation-degrade', reduceQuality: true },
    CACHE: { name: 'adaptation-cache', cacheResults: true },
    RATE_LIMIT: { name: 'adaptation-rate-limit', reduceTraffic: true }
  }
};

class SelfHealing {
  constructor() {
    this.rlm = null;
    this.healingHistory = [];
    this.activeHealings = new Map();
    this.strategies = new Map();
    this.stateFile = join(process.cwd(), '.selfhealing', 'state.json');
    this.setupStrategies();
  }

  async initialize() {
    this.rlm = await getRLM();
    this.loadState();
    return this;
  }

  setupStrategies() {
    // Register built-in strategies
    for (const [category, strategies] of Object.entries(HEALING_STRATEGIES)) {
      for (const [name, strategy] of Object.entries(strategies)) {
        this.strategies.set(strategy.name, strategy);
      }
    }
  }

  // Load state from disk
  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const state = JSON.parse(readFileSync(this.stateFile, 'utf8'));
        this.healingHistory = state.healingHistory || [];
      }
    } catch (error) {
      console.error('Failed to load self-healing state:', error.message);
    }
  }

  // Save state to disk
  saveState() {
    try {
      const dir = join(process.cwd(), '.selfhealing');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.stateFile, JSON.stringify({
        healingHistory: this.healingHistory.slice(-100) // Keep last 100
      }, null, 2));
    } catch (error) {
      console.error('Failed to save self-healing state:', error.message);
    }
  }

  // Monitor a function for failures
  monitor(name, fn, options = {}) {
    const self = this;
    const {
      strategy = 'retry-exponential',
      maxFailures = 3,
      onHealing = null,
      fallback = null
    } = options;

    return async function(...args) {
      let failures = 0;
      const context = { name, args, startTime: Date.now() };

      while (failures < maxFailures) {
        try {
          const result = await fn.apply(this, args);
          
          // Success - reset failure count
          if (failures > 0) {
            console.log(`✓ ${name} recovered after ${failures} failures`);
            await self.recordHealing(context, 'success', failures);
          }
          return result;

        } catch (error) {
          failures++;
          console.log(`⚠ ${name} failed (${failures}/${maxFailures}): ${error.message}`);

          // Try healing
          const healed = await self.attemptHealing(name, error, strategy, context);
          
          if (healed) {
            console.log(`✓ ${name} healed using ${strategy}`);
            continue;
          }

          // Try fallback
          if (fallback) {
            console.log(`↻ ${name} using fallback`);
            return fallback(...args);
          }

          // Wait before retry
          if (failures < maxFailures) {
            const delay = self.getRetryDelay(strategy, failures);
            await self.sleep(delay);
          }
        }
      }

      // All attempts failed
      console.log(`✗ ${name} failed after ${maxFailures} attempts`);
      await self.recordHealing(context, 'failed', failures);
      throw new Error(`${name} failed after ${maxFailures} attempts`);
    };
  }

  // Attempt healing
  async attemptHealing(name, error, strategyName, context) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.log(`Unknown healing strategy: ${strategyName}`);
      return false;
    }

    const healingId = `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const healing = {
      id: healingId,
      name,
      strategy: strategyName,
      error: error.message,
      timestamp: new Date().toISOString(),
      context,
      status: 'attempting'
    };

    this.activeHealings.set(healingId, healing);

    try {
      let success = false;

      switch (strategy.category || 'retry') {
        case 'retry':
          // For retry strategies, we just return true to indicate retry should happen
          success = true;
          break;

        case 'fallback':
          success = await this.applyFallbackStrategy(strategy, context);
          break;

        case 'recovery':
          success = await this.applyRecoveryStrategy(strategy, name);
          break;

        case 'adaptation':
          success = await this.applyAdaptationStrategy(strategy, name);
          break;
      }

      healing.status = success ? 'success' : 'failed';
      healing.endTime = new Date().toISOString();

      // Record in RLM
      await this.rlm.learn({
        type: 'self-healing',
        input: { name, error: error.message, strategy: strategyName },
        output: { success, healingId },
        success,
        duration: Date.now() - context.startTime,
        context: { healing: name, strategy: strategyName }
      });

      return success;

    } catch (healingError) {
      healing.status = 'error';
      healing.error = healingError.message;
      healing.endTime = new Date().toISOString();
      return false;

    } finally {
      this.activeHealings.delete(healingId);
      this.healingHistory.push(healing);
      this.saveState();
    }
  }

  // Apply fallback strategy
  async applyFallbackStrategy(strategy, context) {
    if (strategy.useDefault) {
      console.log(`  Using default value for ${context.name}`);
      return true;
    }
    if (strategy.useCache) {
      console.log(`  Using cached value for ${context.name}`);
      return true;
    }
    if (strategy.threshold) {
      // Circuit breaker logic
      console.log(`  Circuit breaker triggered for ${context.name}`);
      return true;
    }
    return false;
  }

  // Apply recovery strategy
  async applyRecoveryStrategy(strategy, name) {
    if (strategy.graceful) {
      console.log(`  Gracefully restarting ${name}`);
      // In real implementation, this would restart the component
      return true;
    }
    if (strategy.clearState) {
      console.log(`  Resetting state for ${name}`);
      // In real implementation, this would clear component state
      return true;
    }
    if (strategy.isolateComponent) {
      console.log(`  Isolating ${name}`);
      // In real implementation, this would isolate the component
      return true;
    }
    return false;
  }

  // Apply adaptation strategy
  async applyAdaptationStrategy(strategy, name) {
    if (strategy.reduceQuality) {
      console.log(`  Degrading quality for ${name}`);
      return true;
    }
    if (strategy.cacheResults) {
      console.log(`  Caching results for ${name}`);
      return true;
    }
    if (strategy.reduceTraffic) {
      console.log(`  Rate limiting ${name}`);
      return true;
    }
    return false;
  }

  // Get retry delay
  getRetryDelay(strategyName, attempt) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) return 1000;

    if (strategy.backoff) {
      return strategy.delay * Math.pow(strategy.backoff, attempt - 1);
    }
    if (strategy.increment) {
      return strategy.delay + (strategy.increment * (attempt - 1));
    }
    return strategy.delay;
  }

  // Record healing attempt
  async recordHealing(context, status, attempts) {
    const healing = {
      id: `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: context.name,
      status,
      attempts,
      timestamp: new Date().toISOString(),
      duration: Date.now() - context.startTime
    };

    this.healingHistory.push(healing);
    this.saveState();

    // Record in RLM
    await this.rlm.learn({
      type: 'healing-record',
      input: { name: context.name, attempts },
      output: { status },
      success: status === 'success',
      duration: healing.duration,
      context: { healing: context.name }
    });
  }

  // Get statistics
  getStats() {
    const total = this.healingHistory.length;
    const successful = this.healingHistory.filter(h => h.status === 'success').length;
    const failed = this.healingHistory.filter(h => h.status === 'failed').length;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      activeHealings: this.activeHealings.size
    };
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

export async function getSelfHealing() {
  if (!instance) {
    instance = new SelfHealing();
    await instance.initialize();
  }
  return instance;
}

export { SelfHealing, HEALING_STRATEGIES };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const healing = await getSelfHealing();

  switch (command) {
    case 'monitor':
      const name = process.argv[3] || 'test';
      const strategy = process.argv[4] || 'retry-exponential';
      
      // Example monitored function
      const monitoredFn = healing.monitor(name, async () => {
        if (Math.random() < 0.5) throw new Error('Random failure');
        return 'success';
      }, { strategy });

      // Run it
      try {
        const result = await monitoredFn();
        console.log('Result:', result);
      } catch (error) {
        console.log('Final error:', error.message);
      }
      break;

    case 'stats':
      console.log('Self-Healing Stats:', JSON.stringify(healing.getStats(), null, 2));
      break;

    case 'strategies':
      console.log('Available Strategies:');
      for (const [name, strategy] of healing.strategies) {
        console.log(`  ${name}: ${JSON.stringify(strategy)}`);
      }
      break;

    default:
      console.log('Self-Healing');
      console.log('');
      console.log('Commands:');
      console.log('  monitor [name] [strategy]  Monitor function for failures');
      console.log('  stats                      Show healing statistics');
      console.log('  strategies                 List available strategies');
  }
}
