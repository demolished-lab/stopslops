#!/usr/bin/env node
// Evolution Scheduler - Manages the self-evolution cycle
import { getRLM, EVOLUTION_STATES } from './rlm-engine.mjs';
import { getTelemetryCollector } from './telemetry-collector.mjs';
import { getProposalGenerator } from './proposal-generator.mjs';
import { getAutoImplementer } from './auto-implementer.mjs';

const EVOLUTION_CYCLES = {
  LEARNING: { duration: 300000, description: 'Collect telemetry data' }, // 5 minutes
  ANALYZING: { duration: 60000, description: 'Analyze patterns' }, // 1 minute
  PROPOSING: { duration: 30000, description: 'Generate proposals' }, // 30 seconds
  IMPLEMENTING: { duration: 120000, description: 'Implement changes' }, // 2 minutes
  DEPLOYING: { duration: 60000, description: 'Deploy updates' }, // 1 minute
  EVALUATING: { duration: 30000, description: 'Evaluate results' } // 30 seconds
};

class EvolutionScheduler {
  constructor() {
    this.rlm = null;
    this.telemetry = null;
    this.proposalGenerator = null;
    this.autoImplementer = null;
    this.running = false;
    this.cycleTimer = null;
    this.currentCycle = 0;
    this.totalCycles = 0;
    this.evolutionHistory = [];
  }

  async initialize() {
    this.rlm = await getRLM();
    this.telemetry = await getTelemetryCollector();
    this.proposalGenerator = await getProposalGenerator();
    this.autoImplementer = await getAutoImplementer();
    return this;
  }

  // Start evolution
  async start() {
    if (this.running) {
      console.log('Evolution already running');
      return;
    }

    this.running = true;
    console.log('🧬 Evolution started');

    // Start telemetry collection
    this.telemetry.startPeriodicCollection(30000);

    // Start evolution cycle
    await this.runCycle();
  }

  // Stop evolution
  async stop() {
    this.running = false;
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }

    this.telemetry.stopPeriodicCollection();
    console.log(' Evolution stopped');
  }

  // Run evolution cycle
  async runCycle() {
    if (!this.running) return;

    this.currentCycle++;
    console.log(`\n🔄 Evolution cycle ${this.currentCycle} started`);

    const cycleStart = Date.now();
    const cycleResults = {};

    try {
      // Phase 1: Learning
      console.log('📚 Phase 1: Learning...');
      this.rlm.state = EVOLUTION_STATES.LEARNING;
      await this.sleep(EVOLUTION_CYCLES.LEARNING.duration);
      cycleResults.learning = {
        duration: Date.now() - cycleStart,
        interactions: this.rlm.metrics.interactions
      };

      // Phase 2: Analyzing
      console.log('🔍 Phase 2: Analyzing...');
      this.rlm.state = EVOLUTION_STATES.ANALYZING;
      const analysis = await this.rlm.analyze();
      cycleResults.analysis = analysis;

      // Phase 3: Proposing
      console.log('💡 Phase 3: Proposing...');
      this.rlm.state = EVOLUTION_STATES.PROPOSING;
      const proposals = await this.proposalGenerator.generateProposals(analysis);
      cycleResults.proposals = proposals.length;

      // Phase 4: Implementing
      console.log('🔧 Phase 4: Implementing...');
      this.rlm.state = EVOLUTION_STATES.IMPLEMENTING;
      const implementations = await this.autoImplementer.implementAll();
      cycleResults.implementations = implementations.length;

      // Phase 5: Deploying
      console.log('🚀 Phase 5: Deploying...');
      this.rlm.state = EVOLUTION_STATES.DEPLOYING;
      await this.deployUpdates();
      cycleResults.deployments = this.rlm.metrics.deployments;

      // Phase 6: Evaluating
      console.log('📊 Phase 6: Evaluating...');
      this.rlm.state = EVOLUTION_STATES.EVALUATING;
      const evaluation = await this.evaluate();
      cycleResults.evaluation = evaluation;

      // Record cycle
      const cycleResult = {
        cycle: this.currentCycle,
        timestamp: new Date().toISOString(),
        duration: Date.now() - cycleStart,
        results: cycleResults,
        omnipotence: this.rlm.getOmnipotenceLevel()
      };

      this.evolutionHistory.push(cycleResult);
      this.totalCycles++;

      console.log(`\n✅ Evolution cycle ${this.currentCycle} completed`);
      console.log(`   Duration: ${cycleResult.duration}ms`);
      console.log(`   Proposals: ${cycleResults.proposals}`);
      console.log(`   Implementations: ${cycleResults.implementations}`);
      console.log(`   Omnipotence: ${cycleResult.omnipotence.current.name} (${cycleResult.omnipotence.progress.toFixed(1)}%)`);

      // Save state
      await this.rlm.saveState();

      // Schedule next cycle
      if (this.running) {
        this.cycleTimer = setTimeout(() => this.runCycle(), 30000); // 30 seconds between cycles
      }

    } catch (error) {
      console.error(`❌ Evolution cycle ${this.currentCycle} failed:`, error.message);

      // Record failure
      this.evolutionHistory.push({
        cycle: this.currentCycle,
        timestamp: new Date().toISOString(),
        duration: Date.now() - cycleStart,
        error: error.message,
        omnipotence: this.rlm.getOmnipotenceLevel()
      });

      // Retry after delay
      if (this.running) {
        this.cycleTimer = setTimeout(() => this.runCycle(), 60000); // 1 minute delay on failure
      }
    }
  }

  // Deploy updates
  async deployUpdates() {
    // In a real implementation, this would:
    // 1. Create git commit
    // 2. Push to repository
    // 3. Trigger CI/CD pipeline
    // 4. Deploy to production

    console.log('Deploying updates...');

    // Simulate deployment
    await this.sleep(1000);

    this.rlm.metrics.deployments++;
    console.log('✓ Updates deployed');
  }

  // Evaluate evolution
  async evaluate() {
    const stats = {
      before: this.evolutionHistory.length > 0 ? 
        this.evolutionHistory[this.evolutionHistory.length - 1].omnipotence : 
        this.rlm.getOmnipotenceLevel(),
      after: this.rlm.getOmnipotenceLevel(),
      improvement: 0
    };

    if (stats.before && stats.after) {
      stats.improvement = stats.after.score - stats.before.score;
    }

    return stats;
  }

  // Get statistics
  getStats() {
    return {
      running: this.running,
      currentCycle: this.currentCycle,
      totalCycles: this.totalCycles,
      historyLength: this.evolutionHistory.length,
      omnipotence: this.rlm.getOmnipotenceLevel(),
      lastCycle: this.evolutionHistory.length > 0 ? 
        this.evolutionHistory[this.evolutionHistory.length - 1] : null
    };
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

export async function getEvolutionScheduler() {
  if (!instance) {
    instance = new EvolutionScheduler();
    await instance.initialize();
  }
  return instance;
}

export { EvolutionScheduler, EVOLUTION_CYCLES };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const scheduler = await getEvolutionScheduler();

  switch (command) {
    case 'start':
      await scheduler.start();
      // Keep process alive
      process.on('SIGINT', async () => {
        await scheduler.stop();
        process.exit(0);
      });
      break;

    case 'stop':
      await scheduler.stop();
      break;

    case 'stats':
      console.log('Evolution Stats:', JSON.stringify(scheduler.getStats(), null, 2));
      break;

    case 'status':
      const stats = scheduler.getStats();
      console.log('Evolution Status:');
      console.log(`  Running: ${stats.running}`);
      console.log(`  Current Cycle: ${stats.currentCycle}`);
      console.log(`  Total Cycles: ${stats.totalCycles}`);
      console.log(`  Omnipotence: ${stats.omnipotence.current.name} (${stats.omnipotence.progress.toFixed(1)}%)`);
      break;

    default:
      console.log('Evolution Scheduler');
      console.log('');
      console.log('Commands:');
      console.log('  start    Start evolution');
      console.log('  stop     Stop evolution');
      console.log('  stats    Show evolution statistics');
      console.log('  status   Show evolution status');
  }
}
