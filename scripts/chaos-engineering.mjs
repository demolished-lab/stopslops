#!/usr/bin/env node
// Chaos Engineering - Auto-inject failures to test recovery
import { getRLM } from './rlm-engine.mjs';

const CHAOS_EXPERIMENTS = {
  // Network chaos
  NETWORK: {
    LATENCY: { name: 'network-latency', description: 'Add network latency', minMs: 100, maxMs: 5000 },
    PACKET_LOSS: { name: 'packet-loss', description: 'Simulate packet loss', percentage: 0.1 },
    DNS_FAILURE: { name: 'dns-failure', description: 'Simulate DNS failure' },
    CONNECTION_RESET: { name: 'connection-reset', description: 'Simulate connection reset' }
  },
  // Resource chaos
  RESOURCE: {
    CPU_STRESS: { name: 'cpu-stress', description: 'High CPU usage', duration: 30000 },
    MEMORY_STRESS: { name: 'memory-stress', description: 'High memory usage', mb: 500 },
    DISK_FULL: { name: 'disk-full', description: 'Simulate disk full' },
    FILE_DESCRIPTOR_LEAK: { name: 'fd-leak', description: 'Leak file descriptors' }
  },
  // Service chaos
  SERVICE: {
    SLOW_RESPONSE: { name: 'slow-response', description: 'Slow service response', delayMs: 5000 },
    TIMEOUT: { name: 'timeout', description: 'Service timeout' },
    CONNECTION_REFUSED: { name: 'connection-refused', description: 'Connection refused' },
    PARTIAL_FAILURE: { name: 'partial-failure', description: 'Some requests fail' }
  },
  // Data chaos
  DATA: {
    CORRUPTION: { name: 'data-corruption', description: 'Corrupt data' },
    SCHEMA_MISMATCH: { name: 'schema-mismatch', description: 'Schema mismatch' },
    MISSING_DATA: { name: 'missing-data', description: 'Missing required data' },
    DUPLICATE_DATA: { name: 'duplicate-data', description: 'Duplicate data' }
  }
};

class ChaosEngineering {
  constructor() {
    this.rlm = null;
    this.experiments = [];
    this.results = [];
    this.running = false;
    this.targets = new Map();
  }

  async initialize() {
    this.rlm = await getRLM();
    return this;
  }

  // Register target for chaos testing
  registerTarget(name, config) {
    this.targets.set(name, {
      name,
      healthCheck: config.healthCheck,
      fallback: config.fallback,
      recovery: config.recovery,
      ...config
    });
  }

  // Run chaos experiment
  async runExperiment(experimentType, targetName, options = {}) {
    const experiment = this.getExperiment(experimentType);
    const target = this.targets.get(targetName);

    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentType}`);
    }

    if (!target) {
      throw new Error(`Unknown target: ${targetName}`);
    }

    console.log(`\n🔥 Running chaos experiment: ${experiment.name}`);
    console.log(`   Target: ${targetName}`);
    console.log(`   Description: ${experiment.description}`);

    const startTime = Date.now();
    const result = {
      id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      experiment: experiment.name,
      target: targetName,
      startTime: new Date().toISOString(),
      options,
      status: 'running'
    };

    try {
      // Inject chaos
      await this.injectChaos(experiment, target, options);

      // Wait for effects
      await this.sleep(options.duration || 5000);

      // Measure impact
      const impact = await this.measureImpact(target);

      // Attempt recovery
      const recovery = await this.attemptRecovery(target);

      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime;
      result.impact = impact;
      result.recovery = recovery;
      result.status = recovery.success ? 'recovered' : 'failed';

      console.log(`   Impact: ${impact.description}`);
      console.log(`   Recovery: ${recovery.success ? '✓ Success' : '✗ Failed'}`);

    } catch (error) {
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime;
      result.status = 'error';
      result.error = error.message;

      console.log(`   Error: ${error.message}`);
    }

    // Record in RLM
    await this.rlm.learn({
      type: 'chaos-experiment',
      input: { experiment: experiment.name, target: targetName, options },
      output: result,
      success: result.status === 'recovered',
      duration: result.duration,
      context: { experiment: experiment.name, target: targetName }
    });

    this.results.push(result);
    return result;
  }

  // Inject chaos
  async injectChaos(experiment, target, options) {
    switch (experiment.name) {
      case 'network-latency':
        await this.injectLatency(target, options.latency || 1000);
        break;
      case 'packet-loss':
        await this.injectPacketLoss(target, options.percentage || 0.1);
        break;
      case 'slow-response':
        await this.injectSlowResponse(target, options.delay || 5000);
        break;
      case 'timeout':
        await this.injectTimeout(target, options.timeout || 3000);
        break;
      case 'connection-refused':
        await this.injectConnectionRefused(target);
        break;
      case 'cpu-stress':
        await this.injectCpuStress(options.duration || 10000);
        break;
      case 'memory-stress':
        await this.injectMemoryStress(options.mb || 100);
        break;
      case 'data-corruption':
        await this.injectDataCorruption(target);
        break;
      default:
        console.log(`   No injector for ${experiment.name}, simulating`);
    }
  }

  // Inject latency
  async injectLatency(target, ms) {
    console.log(`   Injecting ${ms}ms latency`);
    // In real implementation, this would modify network settings
    // For now, we simulate by adding delay to operations
    const originalHealthCheck = target.healthCheck;
    target.healthCheck = async () => {
      await this.sleep(ms);
      return originalHealthCheck();
    };
  }

  // Inject packet loss
  async injectPacketLoss(target, percentage) {
    console.log(`   Injecting ${percentage * 100}% packet loss`);
    const originalHealthCheck = target.healthCheck;
    target.healthCheck = async () => {
      if (Math.random() < percentage) {
        throw new Error('Simulated packet loss');
      }
      return originalHealthCheck();
    };
  }

  // Inject slow response
  async injectSlowResponse(target, delay) {
    console.log(`   Injecting ${delay}ms delay`);
    const originalHealthCheck = target.healthCheck;
    target.healthCheck = async () => {
      await this.sleep(delay);
      return originalHealthCheck();
    };
  }

  // Inject timeout
  async injectTimeout(target, timeout) {
    console.log(`   Injecting ${timeout}ms timeout`);
    const originalHealthCheck = target.healthCheck;
    target.healthCheck = async () => {
      return Promise.race([
        originalHealthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]);
    };
  }

  // Inject connection refused
  async injectConnectionRefused(target) {
    console.log('   Injecting connection refused');
    target.healthCheck = async () => {
      throw new Error('Connection refused');
    };
  }

  // Inject CPU stress
  async injectCpuStress(duration) {
    console.log(`   Injecting CPU stress for ${duration}ms`);
    const start = Date.now();
    while (Date.now() - start < duration) {
      // Busy loop to consume CPU
      Math.random();
    }
  }

  // Inject memory stress
  async injectMemoryStress(mb) {
    console.log(`   Injecting ${mb}MB memory stress`);
    const buffers = [];
    for (let i = 0; i < mb; i++) {
      buffers.push(Buffer.alloc(1024 * 1024)); // 1MB each
    }
    // Keep references to prevent GC
    return buffers;
  }

  // Inject data corruption
  async injectDataCorruption(target) {
    console.log('   Injecting data corruption');
    const originalHealthCheck = target.healthCheck;
    target.healthCheck = async () => {
      const result = await originalHealthCheck();
      // Corrupt the result
      if (typeof result === 'object') {
        result.corrupted = true;
      }
      return result;
    };
  }

  // Measure impact
  async measureImpact(target) {
    console.log('   Measuring impact...');

    const impact = {
      healthCheckFailed: false,
      responseTime: 0,
      errors: 0,
      description: ''
    };

    try {
      const start = Date.now();
      await target.healthCheck();
      impact.responseTime = Date.now() - start;
    } catch (error) {
      impact.healthCheckFailed = true;
      impact.errors++;
    }

    // Additional checks
    if (impact.healthCheckFailed) {
      impact.description = 'Health check failed';
    } else if (impact.responseTime > 5000) {
      impact.description = `Slow response: ${impact.responseTime}ms`;
    } else {
      impact.description = `Minimal impact (${impact.responseTime}ms)`;
    }

    return impact;
  }

  // Attempt recovery
  async attemptRecovery(target) {
    console.log('   Attempting recovery...');

    const recovery = {
      success: false,
      attempts: 0,
      maxAttempts: 3,
      description: ''
    };

    // Restore original health check if we modified it
    if (target.originalHealthCheck) {
      target.healthCheck = target.originalHealthCheck;
    }

    for (let i = 0; i < recovery.maxAttempts; i++) {
      recovery.attempts++;

      try {
        await target.healthCheck();
        recovery.success = true;
        recovery.description = `Recovered after ${recovery.attempts} attempts`;
        break;
      } catch (error) {
        console.log(`   Recovery attempt ${i + 1} failed: ${error.message}`);
        await this.sleep(1000 * (i + 1)); // Exponential backoff
      }
    }

    if (!recovery.success) {
      recovery.description = `Failed to recover after ${recovery.maxAttempts} attempts`;
    }

    return recovery;
  }

  // Run all experiments on a target
  async runAllExperiments(targetName) {
    const results = [];

    for (const category of Object.values(CHAOS_EXPERIMENTS)) {
      for (const experiment of Object.values(category)) {
        const result = await this.runExperiment(experiment.name, targetName);
        results.push(result);
      }
    }

    return results;
  }

  // Get statistics
  getStats() {
    const total = this.results.length;
    const recovered = this.results.filter(r => r.status === 'recovered').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const errors = this.results.filter(r => r.status === 'error').length;

    return {
      total,
      recovered,
      failed,
      errors,
      recoveryRate: total > 0 ? recovered / total : 0
    };
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

export async function getChaosEngineering() {
  if (!instance) {
    instance = new ChaosEngineering();
    await instance.initialize();
  }
  return instance;
}

export { ChaosEngineering, CHAOS_EXPERIMENTS };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const chaos = await getChaosEngineering();

  switch (command) {
    case 'run':
      const experiment = process.argv[3];
      const target = process.argv[4];
      if (!experiment || !target) {
        console.error('Usage: chaos-engineering.mjs run <experiment> <target>');
        process.exit(1);
      }
      await chaos.runExperiment(experiment, target);
      break;

    case 'stats':
      console.log('Chaos Stats:', JSON.stringify(chaos.getStats(), null, 2));
      break;

    case 'experiments':
      console.log('Available Experiments:');
      for (const [category, experiments] of Object.entries(CHAOS_EXPERIMENTS)) {
        console.log(`\n${category}:`);
        for (const exp of Object.values(experiments)) {
          console.log(`  ${exp.name}: ${exp.description}`);
        }
      }
      break;

    default:
      console.log('Chaos Engineering');
      console.log('');
      console.log('Commands:');
      console.log('  run <experiment> <target>  Run chaos experiment');
      console.log('  stats                      Show chaos statistics');
      console.log('  experiments                List available experiments');
  }
}
