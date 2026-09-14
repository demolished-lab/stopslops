#!/usr/bin/env node
// Telemetry Collector - Gathers data from all system components
import { getRLM } from './rlm-engine.mjs';

class TelemetryCollector {
  constructor() {
    this.rlm = null;
    this.collectors = new Map();
    this.data = new Map();
    this.interval = null;
    this.running = false;
  }

  async initialize() {
    this.rlm = await getRLM();
    this.setupCollectors();
    return this;
  }

  setupCollectors() {
    // Checker telemetry
    this.collectors.set('checker', {
      collect: async (event) => {
        return {
          type: 'checker',
          category: event.category,
          success: event.violations === 0,
          duration: event.duration,
          violations: event.violations,
          severity: event.severity || 0,
          context: {
            category: event.category,
            tenantId: event.tenantId
          }
        };
      }
    });

    // Judge telemetry
    this.collectors.set('judge', {
      collect: async (event) => {
        return {
          type: 'judge',
          category: event.category,
          success: event.verdict === 'pass',
          duration: event.duration,
          verdict: event.verdict,
          confidence: event.confidence,
          context: {
            category: event.category,
            tenantId: event.tenantId
          }
        };
      }
    });

    // API telemetry
    this.collectors.set('api', {
      collect: async (event) => {
        return {
          type: 'api',
          endpoint: event.endpoint,
          success: event.statusCode < 400,
          duration: event.duration,
          statusCode: event.statusCode,
          method: event.method,
          context: {
            endpoint: event.endpoint,
            tenantId: event.tenantId
          }
        };
      }
    });

    // Storage telemetry
    this.collectors.set('storage', {
      collect: async (event) => {
        return {
          type: 'storage',
          operation: event.operation,
          success: event.success,
          duration: event.duration,
          size: event.size,
          context: {
            operation: event.operation
          }
        };
      }
    });

    // User interaction telemetry
    this.collectors.set('user', {
      collect: async (event) => {
        return {
          type: 'user',
          action: event.action,
          success: event.success,
          duration: event.duration,
          feedback: event.feedback,
          context: {
            action: event.action,
            userId: event.userId
          }
        };
      }
    });

    // System telemetry
    this.collectors.set('system', {
      collect: async (event) => {
        return {
          type: 'system',
          component: event.component,
          success: event.healthy,
          duration: event.responseTime,
          metrics: event.metrics,
          context: {
            component: event.component
          }
        };
      }
    });
  }

  // Collect telemetry event
  async collect(collectorType, event) {
    const collector = this.collectors.get(collectorType);
    if (!collector) {
      console.warn(`Unknown collector type: ${collectorType}`);
      return null;
    }

    try {
      const telemetryData = await collector.collect(event);
      
      // Send to RLM for learning
      await this.rlm.learn(telemetryData);

      // Store locally for analysis
      this.storeData(collectorType, telemetryData);

      return telemetryData;
    } catch (error) {
      console.error(`Telemetry collection failed for ${collectorType}:`, error.message);
      return null;
    }
  }

  // Store telemetry data locally
  storeData(type, data) {
    if (!this.data.has(type)) {
      this.data.set(type, []);
    }

    const typeData = this.data.get(type);
    typeData.push({
      ...data,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 entries per type
    if (typeData.length > 1000) {
      this.data.set(type, typeData.slice(-1000));
    }
  }

  // Get aggregated stats
  getStats() {
    const stats = {
      totalEvents: 0,
      byType: {},
      successRate: 0,
      avgDuration: 0
    };

    let totalSuccess = 0;
    let totalDuration = 0;

    for (const [type, events] of this.data) {
      const typeStats = {
        count: events.length,
        successes: events.filter(e => e.success).length,
        avgDuration: events.reduce((sum, e) => sum + (e.duration || 0), 0) / events.length
      };

      stats.byType[type] = typeStats;
      stats.totalEvents += typeStats.count;
      totalSuccess += typeStats.successes;
      totalDuration += events.reduce((sum, e) => sum + (e.duration || 0), 0);
    }

    stats.successRate = stats.totalEvents > 0 ? totalSuccess / stats.totalEvents : 0;
    stats.avgDuration = stats.totalEvents > 0 ? totalDuration / stats.totalEvents : 0;

    return stats;
  }

  // Start periodic collection
  startPeriodicCollection(intervalMs = 60000) {
    if (this.running) return;

    this.running = true;
    this.interval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, intervalMs);

    console.log(`Telemetry collection started (interval: ${intervalMs}ms)`);
  }

  // Stop periodic collection
  stopPeriodicCollection() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    console.log('Telemetry collection stopped');
  }

  // Collect system metrics
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    await this.collect('system', {
      component: 'process',
      healthy: true,
      responseTime: 0,
      metrics: {
        memoryHeap: memUsage.heapUsed,
        memoryRss: memUsage.rss,
        cpuUser: cpuUsage.user,
        cpuSystem: cpuUsage.system,
        uptime: process.uptime()
      }
    });
  }

  // Export telemetry data
  async exportData(format = 'json') {
    const data = {
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      data: Object.fromEntries(this.data)
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // Add more formats as needed
    return data;
  }

  // Shutdown
  async shutdown() {
    this.stopPeriodicCollection();
    this.data.clear();
    this.collectors.clear();
  }
}

// Singleton instance
let instance = null;

export async function getTelemetryCollector() {
  if (!instance) {
    instance = new TelemetryCollector();
    await instance.initialize();
  }
  return instance;
}

export { TelemetryCollector };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const collector = await getTelemetryCollector();

  switch (command) {
    case 'stats':
      console.log('Telemetry Stats:', JSON.stringify(collector.getStats(), null, 2));
      break;

    case 'export':
      const data = await collector.exportData();
      console.log(data);
      break;

    case 'start':
      collector.startPeriodicCollection();
      console.log('Telemetry collection started');
      // Keep process alive
      process.on('SIGINT', async () => {
        await collector.shutdown();
        process.exit(0);
      });
      break;

    default:
      console.log('Telemetry Collector');
      console.log('');
      console.log('Commands:');
      console.log('  stats    Show telemetry statistics');
      console.log('  export   Export telemetry data');
      console.log('  start    Start periodic collection');
  }
}
