#!/usr/bin/env node
// Proposal Generator - Creates improvement proposals from analysis
import { getRLM } from './rlm-engine.mjs';

const PROPOSAL_TYPES = {
  PERFORMANCE: 'performance',
  RELIABILITY: 'reliability',
  SECURITY: 'security',
  USABILITY: 'usability',
  SCALABILITY: 'scalability',
  FEATURE: 'feature'
};

const PRIORITY_LEVELS = {
  CRITICAL: { level: 0, name: 'Critical', autoImplement: true },
  HIGH: { level: 1, name: 'High', autoImplement: true },
  MEDIUM: { level: 2, name: 'Medium', autoImplement: false },
  LOW: { level: 3, name: 'Low', autoImplement: false }
};

class ProposalGenerator {
  constructor() {
    this.rlm = null;
    this.proposals = [];
    this.templates = this.loadTemplates();
  }

  async initialize() {
    this.rlm = await getRLM();
    return this;
  }

  loadTemplates() {
    return {
      [PROPOSAL_TYPES.PERFORMANCE]: {
        slowOperation: {
          title: 'Optimize slow operation: {operation}',
          description: 'Operation {operation} is taking {avgDuration}ms on average, which exceeds the target of {targetDuration}ms.',
          implementation: 'Add caching, optimize algorithm, or parallelize operation.',
          estimatedImpact: 'high'
        },
        memoryLeak: {
          title: 'Fix memory leak in {component}',
          description: 'Component {component} is showing increasing memory usage over time.',
          implementation: 'Review memory allocation patterns and add cleanup logic.',
          estimatedImpact: 'critical'
        }
      },
      [PROPOSAL_TYPES.RELIABILITY]: {
        lowSuccessRate: {
          title: 'Improve success rate for {category}',
          description: 'Success rate for {category} is {currentRate}%, below target of {targetRate}%.',
          implementation: 'Add error handling, retry logic, or fallback mechanisms.',
          estimatedImpact: 'high'
        },
        frequentErrors: {
          title: 'Reduce error frequency in {component}',
          description: 'Component {component} is experiencing {errorCount} errors per hour.',
          implementation: 'Add input validation, error boundaries, or circuit breakers.',
          estimatedImpact: 'high'
        }
      },
      [PROPOSAL_TYPES.SECURITY]: {
        vulnerability: {
          title: 'Fix security vulnerability: {vulnerability}',
          description: 'Detected {vulnerability} in {component}.',
          implementation: 'Apply security patch or implement security controls.',
          estimatedImpact: 'critical'
        },
        weakAuth: {
          title: 'Strengthen authentication for {endpoint}',
          description: 'Endpoint {endpoint} has weak authentication controls.',
          implementation: 'Add multi-factor authentication or strengthen token validation.',
          estimatedImpact: 'high'
        }
      },
      [PROPOSAL_TYPES.USABILITY]: {
        confusingUI: {
          title: 'Improve UI clarity for {feature}',
          description: 'Users are struggling with {feature} based on feedback analysis.',
          implementation: 'Redesign UI flow, add tooltips, or improve error messages.',
          estimatedImpact: 'medium'
        },
        slowResponse: {
          title: 'Improve response time for {endpoint}',
          description: 'Endpoint {endpoint} has high response time affecting user experience.',
          implementation: 'Optimize queries, add caching, or implement pagination.',
          estimatedImpact: 'medium'
        }
      },
      [PROPOSAL_TYPES.SCALABILITY]: {
        highLoad: {
          title: 'Scale {component} for high load',
          description: 'Component {component} is approaching capacity limits.',
          implementation: 'Add horizontal scaling, implement caching, or optimize resource usage.',
          estimatedImpact: 'high'
        },
        bottleneck: {
          title: 'Remove bottleneck in {component}',
          description: 'Component {component} is causing system-wide performance issues.',
          implementation: 'Decompose component, add queuing, or implement load balancing.',
          estimatedImpact: 'critical'
        }
      },
      [PROPOSAL_TYPES.FEATURE]: {
        missingFeature: {
          title: 'Add missing feature: {feature}',
          description: 'Users are requesting {feature} based on usage patterns.',
          implementation: 'Design and implement {feature} based on user needs.',
          estimatedImpact: 'medium'
        },
        enhancement: {
          title: 'Enhance {feature} with {capability}',
          description: 'Adding {capability} to {feature} would improve user experience.',
          implementation: 'Extend {feature} to support {capability}.',
          estimatedImpact: 'medium'
        }
      }
    };
  }

  // Generate proposals from analysis
  async generateProposals(analysis) {
    const proposals = [];

    // Generate proposals from patterns
    if (analysis.patterns) {
      proposals.push(...this.generateFromPatterns(analysis.patterns));
    }

    // Generate proposals from opportunities
    if (analysis.opportunities) {
      proposals.push(...this.generateFromOpportunities(analysis.opportunities));
    }

    // Generate proposals from regressions
    if (analysis.regressions) {
      proposals.push(...this.generateFromRegressions(analysis.regressions));
    }

    // Generate proposals from anomalies
    if (analysis.anomalies) {
      proposals.push(...this.generateFromAnomalies(analysis.anomalies));
    }

    // Deduplicate and prioritize
    const uniqueProposals = this.deduplicateProposals(proposals);
    const prioritizedProposals = this.prioritizeProposals(uniqueProposals);

    // Store proposals
    this.proposals = prioritizedProposals;
    this.rlm.proposals = prioritizedProposals;

    return prioritizedProposals;
  }

  // Generate proposals from patterns
  generateFromPatterns(patterns) {
    const proposals = [];

    // Check for low success rate patterns
    if (patterns.failures) {
      for (const [type, stats] of Object.entries(patterns.failures)) {
        if (stats.successRate < 0.8) {
          const template = this.templates[PROPOSAL_TYPES.RELIABILITY].lowSuccessRate;
          proposals.push(this.createProposal(template, {
            category: type,
            currentRate: (stats.successRate * 100).toFixed(1),
            targetRate: '90',
            priority: PRIORITY_LEVELS.HIGH
          }));
        }
      }
    }

    // Check for slow operations
    if (patterns.successes) {
      for (const [type, stats] of Object.entries(patterns.successes)) {
        if (stats.avgDuration > 1000) {
          const template = this.templates[PROPOSAL_TYPES.PERFORMANCE].slowOperation;
          proposals.push(this.createProposal(template, {
            operation: type,
            avgDuration: stats.avgDuration.toFixed(0),
            targetDuration: '500',
            priority: PRIORITY_LEVELS.MEDIUM
          }));
        }
      }
    }

    return proposals;
  }

  // Generate proposals from opportunities
  generateFromOpportunities(opportunities) {
    const proposals = [];

    for (const opportunity of opportunities) {
      let template;

      switch (opportunity.type) {
        case 'low_success_rate':
          template = this.templates[PROPOSAL_TYPES.RELIABILITY].lowSuccessRate;
          proposals.push(this.createProposal(template, {
            category: opportunity.category,
            currentRate: (opportunity.currentRate * 100).toFixed(1),
            targetRate: (opportunity.targetRate * 100).toFixed(0),
            priority: opportunity.priority === 'high' ? PRIORITY_LEVELS.HIGH : PRIORITY_LEVELS.MEDIUM
          }));
          break;

        case 'slow_operations':
          template = this.templates[PROPOSAL_TYPES.PERFORMANCE].slowOperation;
          proposals.push(this.createProposal(template, {
            operation: 'multiple',
            avgDuration: opportunity.avgDuration.toFixed(0),
            targetDuration: '500',
            priority: PRIORITY_LEVELS.MEDIUM
          }));
          break;

        case 'performance_degradation':
          template = this.templates[PROPOSAL_TYPES.PERFORMANCE].memoryLeak;
          proposals.push(this.createProposal(template, {
            component: 'system',
            priority: PRIORITY_LEVELS.HIGH
          }));
          break;
      }
    }

    return proposals;
  }

  // Generate proposals from regressions
  generateFromRegressions(regressions) {
    const proposals = [];

    for (const regression of regressions) {
      if (regression.type === 'success_rate_regression') {
        const template = this.templates[PROPOSAL_TYPES.RELIABILITY].lowSuccessRate;
        proposals.push(this.createProposal(template, {
          category: 'overall',
          currentRate: (regression.newRate * 100).toFixed(1),
          targetRate: (regression.oldRate * 100).toFixed(0),
          priority: regression.severity === 'critical' ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH
        }));
      }
    }

    return proposals;
  }

  // Generate proposals from anomalies
  generateFromAnomalies(anomalies) {
    const proposals = [];

    for (const anomaly of anomalies) {
      if (anomaly.type === 'duration_outlier') {
        const template = this.templates[PROPOSAL_TYPES.PERFORMANCE].slowOperation;
        proposals.push(this.createProposal(template, {
          operation: anomaly.memoryId,
          avgDuration: anomaly.duration.toFixed(0),
          targetDuration: anomaly.avgDuration.toFixed(0),
          priority: PRIORITY_LEVELS.LOW
        }));
      }
    }

    return proposals;
  }

  // Create proposal from template
  createProposal(template, variables) {
    let title = template.title;
    let description = template.description;

    for (const [key, value] of Object.entries(variables)) {
      title = title.replace(`{${key}}`, value);
      description = description.replace(`{${key}}`, value);
    }

    return {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: this.getProposalType(template),
      title,
      description,
      implementation: template.implementation,
      estimatedImpact: template.estimatedImpact,
      priority: variables.priority || PRIORITY_LEVELS.MEDIUM,
      status: 'pending',
      votes: 0,
      metadata: variables
    };
  }

  // Get proposal type from template
  getProposalType(template) {
    for (const [type, templates] of Object.entries(this.templates)) {
      for (const [key, value] of Object.entries(templates)) {
        if (value === template) {
          return type;
        }
      }
    }
    return PROPOSAL_TYPES.FEATURE;
  }

  // Deduplicate proposals
  deduplicateProposals(proposals) {
    const seen = new Set();
    return proposals.filter(proposal => {
      const key = `${proposal.type}-${proposal.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Prioritize proposals
  prioritizeProposals(proposals) {
    return proposals.sort((a, b) => {
      // Sort by priority level (lower is higher priority)
      if (a.priority.level !== b.priority.level) {
        return a.priority.level - b.priority.level;
      }

      // Then by estimated impact
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (impactOrder[a.estimatedImpact] || 3) - (impactOrder[b.estimatedImpact] || 3);
    });
  }

  // Get proposals ready for implementation
  getImplementableProposals() {
    return this.proposals.filter(p => 
      p.status === 'pending' && 
      p.priority.autoImplement
    );
  }

  // Update proposal status
  async updateProposalStatus(proposalId, status, result = null) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (proposal) {
      proposal.status = status;
      if (result) {
        proposal.result = result;
      }
      proposal.updatedAt = new Date().toISOString();

      // Update RLM
      this.rlm.proposals = this.proposals;
      await this.rlm.saveState();
    }
  }

  // Get statistics
  getStats() {
    const stats = {
      total: this.proposals.length,
      byStatus: {},
      byType: {},
      byPriority: {}
    };

    for (const proposal of this.proposals) {
      // By status
      stats.byStatus[proposal.status] = (stats.byStatus[proposal.status] || 0) + 1;

      // By type
      stats.byType[proposal.type] = (stats.byType[proposal.type] || 0) + 1;

      // By priority
      const priorityName = proposal.priority.name;
      stats.byPriority[priorityName] = (stats.byPriority[priorityName] || 0) + 1;
    }

    return stats;
  }
}

// Singleton instance
let instance = null;

export async function getProposalGenerator() {
  if (!instance) {
    instance = new ProposalGenerator();
    await instance.initialize();
  }
  return instance;
}

export { ProposalGenerator, PROPOSAL_TYPES, PRIORITY_LEVELS };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const generator = await getProposalGenerator();

  switch (command) {
    case 'stats':
      console.log('Proposal Stats:', JSON.stringify(generator.getStats(), null, 2));
      break;

    case 'list':
      console.log('Proposals:', JSON.stringify(generator.proposals, null, 2));
      break;

    case 'implementable':
      console.log('Implementable:', JSON.stringify(generator.getImplementableProposals(), null, 2));
      break;

    default:
      console.log('Proposal Generator');
      console.log('');
      console.log('Commands:');
      console.log('  stats          Show proposal statistics');
      console.log('  list           List all proposals');
      console.log('  implementable  List implementable proposals');
  }
}
