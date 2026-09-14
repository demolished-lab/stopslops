#!/usr/bin/env node
// Safety Rails - Kill switches, guardrails, approval workflows
import { getRLM } from './rlm-engine.mjs';

const SAFETY_LEVELS = {
  LOW: { name: 'low', description: 'Basic safety checks', autoApprove: true },
  MEDIUM: { name: 'medium', description: 'Enhanced safety checks', autoApprove: true },
  HIGH: { name: 'high', description: 'Strict safety checks', autoApprove: false },
  CRITICAL: { name: 'critical', description: 'Maximum safety checks', autoApprove: false }
};

class SafetyRails {
  constructor() {
    this.rlm = null;
    this.killSwitches = new Map();
    this.guardrails = new Map();
    this.approvalWorkflows = new Map();
    this.violations = [];
    this.safetyLevel = SAFETY_LEVELS.MEDIUM;
  }

  async initialize() {
    this.rlm = await getRLM();
    this.setupKillSwitches();
    this.setupGuardrails();
    this.setupApprovalWorkflows();
    return this;
  }

  setupKillSwitches() {
    // Global kill switch
    this.killSwitches.set('global', {
      name: 'global',
      enabled: true,
      description: 'Global kill switch - stops all autonomous operations',
      trigger: () => this.safetyLevel === SAFETY_LEVELS.CRITICAL
    });

    // Deployment kill switch
    this.killSwitches.set('deployment', {
      name: 'deployment',
      enabled: true,
      description: 'Stops all deployments',
      trigger: (context) => context.type === 'deploy' && context.risk === 'high'
    });

    // Scaling kill switch
    this.killSwitches.set('scaling', {
      name: 'scaling',
      enabled: true,
      description: 'Stops all scaling operations',
      trigger: (context) => context.type === 'scale' && context.force
    });

    // Data modification kill switch
    this.killSwitches.set('data-modification', {
      name: 'data-modification',
      enabled: true,
      description: 'Stops all data modifications',
      trigger: (context) => context.type === 'data' && context.modification
    });
  }

  setupGuardrails() {
    // Rate limiting guardrail
    this.guardrails.set('rate-limit', {
      name: 'rate-limit',
      description: 'Limits operations per time window',
      check: (context) => {
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxOperations = 10;

        // Count recent operations
        const recentOps = this.violations.filter(
          v => now - v.timestamp < windowMs
        ).length;

        return recentOps < maxOperations;
      }
    });

    // Resource usage guardrail
    this.guardrails.set('resource-usage', {
      name: 'resource-usage',
      description: 'Limits resource usage',
      check: (context) => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        return heapUsedMB < 1000; // Less than 1GB
      }
    });

    // Error rate guardrail
    this.guardrails.set('error-rate', {
      name: 'error-rate',
      description: 'Limits error rate',
      check: (context) => {
        const recentErrors = this.violations.filter(
          v => Date.now() - v.timestamp < 60000
        ).length;
        return recentErrors < 5;
      }
    });

    // Time of day guardrail
    this.guardrails.set('time-of-day', {
      name: 'time-of-day',
      description: 'Limits operations during certain hours',
      check: (context) => {
        const hour = new Date().getHours();
        // No high-risk operations between 2 AM and 6 AM
        if (hour >= 2 && hour <= 6 && context.risk === 'high') {
          return false;
        }
        return true;
      }
    });
  }

  setupApprovalWorkflows() {
    // High-risk deployment workflow
    this.approvalWorkflows.set('high-risk-deploy', {
      name: 'high-risk-deploy',
      description: 'Requires approval for high-risk deployments',
      requiredApprovals: 2,
      approvers: ['admin', 'devops'],
      timeout: 3600000 // 1 hour
    });

    // Data modification workflow
    this.approvalWorkflows.set('data-modification', {
      name: 'data-modification',
      description: 'Requires approval for data modifications',
      requiredApprovals: 1,
      approvers: ['admin'],
      timeout: 1800000 // 30 minutes
    });

    // Production access workflow
    this.approvalWorkflows.set('production-access', {
      name: 'production-access',
      description: 'Requires approval for production access',
      requiredApprovals: 2,
      approvers: ['admin', 'security'],
      timeout: 900000 // 15 minutes
    });
  }

  // Check if operation is allowed
  async checkOperation(operation) {
    console.log('\n🛡️ Checking safety rails...');

    const startTime = Date.now();
    const check = {
      id: `safety_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      startTime: new Date().toISOString(),
      allowed: true,
      violations: [],
      requiresApproval: false
    };

    // Check kill switches
    for (const [name, killSwitch] of this.killSwitches) {
      if (killSwitch.enabled && killSwitch.trigger(operation)) {
        check.allowed = false;
        check.violations.push({
          type: 'kill-switch',
          name,
          description: killSwitch.description
        });
        console.log(`   Kill switch triggered: ${name}`);
      }
    }

    // Check guardrails
    for (const [name, guardrail] of this.guardrails) {
      if (!guardrail.check(operation)) {
        check.allowed = false;
        check.violations.push({
          type: 'guardrail',
          name,
          description: guardrail.description
        });
        console.log(`   Guardrail violated: ${name}`);
      }
    }

    // Check approval workflows
    for (const [name, workflow] of this.approvalWorkflows) {
      if (this.needsApproval(operation, workflow)) {
        check.requiresApproval = true;
        check.violations.push({
          type: 'approval-required',
          name,
          description: workflow.description,
          requiredApprovals: workflow.requiredApprovals,
          approvers: workflow.approvers
        });
        console.log(`   Approval required: ${name}`);
      }
    }

    check.endTime = new Date().toISOString();
    check.duration = Date.now() - startTime;

    // Record violations
    if (check.violations.length > 0) {
      this.violations.push({
        operation,
        violations: check.violations,
        timestamp: Date.now()
      });
    }

    // Record in RLM
    await this.rlm.learn({
      type: 'safety-check',
      input: { operation },
      output: {
        allowed: check.allowed,
        violations: check.violations.length,
        requiresApproval: check.requiresApproval
      },
      success: check.allowed,
      duration: check.duration,
      context: { safety: 'rails' }
    });

    console.log(`   Allowed: ${check.allowed}`);
    console.log(`   Violations: ${check.violations.length}`);
    console.log(`   Requires Approval: ${check.requiresApproval}`);

    return check;
  }

  // Check if operation needs approval
  needsApproval(operation, workflow) {
    // Check if operation matches workflow criteria
    if (operation.type === 'deploy' && operation.risk === 'high') {
      return true;
    }
    if (operation.type === 'data' && operation.modification) {
      return true;
    }
    return false;
  }

  // Set safety level
  setSafetyLevel(level) {
    if (SAFETY_LEVELS[level]) {
      this.safetyLevel = SAFETY_LEVELS[level];
      console.log(`Safety level set to: ${level}`);
    }
  }

  // Enable/disable kill switch
  setKillSwitch(name, enabled) {
    if (this.killSwitches.has(name)) {
      this.killSwitches.get(name).enabled = enabled;
      console.log(`Kill switch ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Get statistics
  getStats() {
    const totalChecks = this.violations.length;
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp < 3600000
    ).length;

    return {
      safetyLevel: this.safetyLevel.name,
      killSwitches: Array.from(this.killSwitches.values()).map(k => ({
        name: k.name,
        enabled: k.enabled
      })),
      guardrails: Array.from(this.guardrails.values()).map(g => ({
        name: g.name,
        description: g.description
      })),
      totalChecks,
      recentViolations
    };
  }
}

// Singleton instance
let instance = null;

export async function getSafetyRails() {
  if (!instance) {
    instance = new SafetyRails();
    await instance.initialize();
  }
  return instance;
}

export { SafetyRails, SAFETY_LEVELS };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const safety = await getSafetyRails();

  switch (command) {
    case 'check':
      const operation = {
        type: 'deploy',
        risk: 'high',
        force: false
      };
      const check = await safety.checkOperation(operation);
      console.log('Safety Check:', JSON.stringify(check, null, 2));
      break;

    case 'level':
      const level = process.argv[3] || 'MEDIUM';
      safety.setSafetyLevel(level);
      break;

    case 'killswitch':
      const killswitch = process.argv[3];
      const enabled = process.argv[4] === 'true';
      safety.setKillSwitch(killswitch, enabled);
      break;

    case 'stats':
      console.log('Safety Stats:', JSON.stringify(safety.getStats(), null, 2));
      break;

    default:
      console.log('Safety Rails');
      console.log('');
      console.log('Commands:');
      console.log('  check                   Check operation safety');
      console.log('  level [level]           Set safety level');
      console.log('  killswitch [name] [on/off]  Toggle kill switch');
      console.log('  stats                   Show safety statistics');
  }
}
