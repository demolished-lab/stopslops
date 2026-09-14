#!/usr/bin/env node
// Root Cause Analysis - Match incidents to known patterns
import { getRLM } from './rlm-engine.mjs';

const INCIDENT_PATTERNS = {
  // Memory patterns
  MEMORY: {
    LEAK: {
      name: 'memory-leak',
      symptoms: ['increasing-memory', 'heap-size', 'gc-pressure'],
      causes: ['unclosed-resources', 'event-listeners', 'caches', 'closures'],
      solutions: ['close-resources', 'remove-listeners', 'limit-cache', 'weak-references']
    },
    OUT_OF_MEMORY: {
      name: 'out-of-memory',
      symptoms: ['heap-limit', 'allocation-failed', 'process-crash'],
      causes: ['large-objects', 'memory-leak', 'insufficient-heap'],
      solutions: ['reduce-allocation', 'fix-leak', 'increase-heap']
    }
  },
  // CPU patterns
  CPU: {
    HIGH_USAGE: {
      name: 'high-cpu',
      symptoms: ['cpu-100', 'slow-response', 'timeout'],
      causes: ['infinite-loop', 'expensive-operation', 'blocking-thread'],
      solutions: ['optimize-algorithm', 'async-processing', 'worker-threads']
    },
    DEADLOCK: {
      name: 'deadlock',
      symptoms: ['no-response', 'thread-blocked', 'resource-wait'],
      causes: ['lock-ordering', 'circular-dependency', 'resource-contention'],
      solutions: ['lock-timeout', 'lock-free', 'resource-pooling']
    }
  },
  // Network patterns
  NETWORK: {
    TIMEOUT: {
      name: 'timeout',
      symptoms: ['connection-timeout', 'read-timeout', 'write-timeout'],
      causes: ['slow-server', 'network-congestion', 'firewall'],
      solutions: ['increase-timeout', 'retry', 'circuit-breaker']
    },
    CONNECTION_REFUSED: {
      name: 'connection-refused',
      symptoms: ['econnrefused', 'service-unavailable'],
      causes: ['service-down', 'port-blocked', 'wrong-address'],
      solutions: ['health-check', 'failover', 'service-discovery']
    }
  },
  // Data patterns
  DATA: {
    CORRUPTION: {
      name: 'data-corruption',
      symptoms: ['checksum-mismatch', 'invalid-format', 'parse-error'],
      causes: ['concurrent-write', 'disk-full', 'hardware-failure'],
      solutions: ['transaction', 'backup', 'validation']
    },
    INCONSISTENCY: {
      name: 'data-inconsistency',
      symptoms: ['version-mismatch', 'stale-data', 'conflict'],
      causes: ['race-condition', 'replication-lag', 'cache-invalidation'],
      solutions: ['locking', 'versioning', 'eventual-consistency']
    }
  },
  // Application patterns
  APPLICATION: {
    CRASH: {
      name: 'crash',
      symptoms: ['uncaught-exception', 'segmentation-fault', 'stack-overflow'],
      causes: ['null-reference', 'invalid-input', 'resource-exhaustion'],
      solutions: ['null-check', 'input-validation', 'resource-limit']
    },
    HANG: {
      name: 'hang',
      symptoms: ['no-response', 'high-latency', 'timeout'],
      causes: ['blocking-operation', 'deadlock', 'resource-starvation'],
      solutions: ['async-processing', 'timeout', 'resource-allocation']
    }
  }
};

class RootCauseAnalysis {
  constructor() {
    this.rlm = null;
    this.incidents = [];
    this.analyses = [];
    this.patternMatches = new Map();
  }

  async initialize() {
    this.rlm = await getRLM();
    return this;
  }

  // Analyze an incident
  async analyzeIncident(incident) {
    console.log(`\n🔍 Analyzing incident: ${incident.id || 'unknown'}`);
    console.log(`   Symptoms: ${incident.symptoms?.join(', ') || 'unknown'}`);

    const startTime = Date.now();
    const analysis = {
      id: `rca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incident,
      startTime: new Date().toISOString(),
      matches: [],
      rootCause: null,
      recommendations: []
    };

    // Find matching patterns
    for (const [category, patterns] of Object.entries(INCIDENT_PATTERNS)) {
      for (const [type, pattern] of Object.entries(patterns)) {
        const matchScore = this.calculateMatchScore(incident, pattern);
        
        if (matchScore > 0.3) {
          analysis.matches.push({
            pattern: pattern.name,
            category,
            type,
            score: matchScore,
            pattern
          });
        }
      }
    }

    // Sort by match score
    analysis.matches.sort((a, b) => b.score - a.score);

    // Get root cause from best match
    if (analysis.matches.length > 0) {
      const bestMatch = analysis.matches[0];
      analysis.rootCause = {
        pattern: bestMatch.pattern,
        causes: bestMatch.pattern.causes,
        confidence: bestMatch.score
      };
      analysis.recommendations = bestMatch.pattern.solutions;
    }

    analysis.endTime = new Date().toISOString();
    analysis.duration = Date.now() - startTime;

    // Record in RLM
    await this.rlm.learn({
      type: 'root-cause-analysis',
      input: { incident },
      output: {
        matches: analysis.matches.length,
        rootCause: analysis.rootCause?.pattern,
        confidence: analysis.rootCause?.confidence
      },
      success: analysis.matches.length > 0,
      duration: analysis.duration,
      context: { rca: incident.id }
    });

    this.analyses.push(analysis);

    console.log(`   Matches found: ${analysis.matches.length}`);
    if (analysis.rootCause) {
      console.log(`   Root cause: ${analysis.rootCause.pattern} (confidence: ${(analysis.rootCause.confidence * 100).toFixed(1)}%)`);
      console.log(`   Recommendations: ${analysis.recommendations.join(', ')}`);
    }

    return analysis;
  }

  // Calculate match score between incident and pattern
  calculateMatchScore(incident, pattern) {
    if (!incident.symptoms || !pattern.symptoms) return 0;

    const incidentSymptoms = new Set(incident.symptoms);
    const patternSymptoms = new Set(pattern.symptoms);

    // Calculate Jaccard similarity
    const intersection = new Set([...incidentSymptoms].filter(x => patternSymptoms.has(x)));
    const union = new Set([...incidentSymptoms, ...patternSymptoms]);

    return intersection.size / union.size;
  }

  // Get pattern for a known issue
  getPattern(category, type) {
    return INCIDENT_PATTERNS[category]?.[type];
  }

  // Add custom pattern
  addPattern(category, type, pattern) {
    if (!INCIDENT_PATTERNS[category]) {
      INCIDENT_PATTERNS[category] = {};
    }
    INCIDENT_PATTERNS[category][type] = pattern;
  }

  // Get statistics
  getStats() {
    const totalAnalyses = this.analyses.length;
    const successfulMatches = this.analyses.filter(a => a.matches.length > 0).length;

    return {
      totalAnalyses,
      successfulMatches,
      matchRate: totalAnalyses > 0 ? successfulMatches / totalAnalyses : 0,
      patternsAvailable: Object.values(INCIDENT_PATTERNS).reduce(
        (sum, cat) => sum + Object.keys(cat).length, 0
      )
    };
  }

  // Get all patterns
  getAllPatterns() {
    return INCIDENT_PATTERNS;
  }
}

// Singleton instance
let instance = null;

export async function getRootCauseAnalysis() {
  if (!instance) {
    instance = new RootCauseAnalysis();
    await instance.initialize();
  }
  return instance;
}

export { RootCauseAnalysis, INCIDENT_PATTERNS };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const rca = await getRootCauseAnalysis();

  switch (command) {
    case 'analyze':
      const incident = {
        id: 'test-incident',
        symptoms: ['increasing-memory', 'heap-size', 'slow-response']
      };
      await rca.analyzeIncident(incident);
      break;

    case 'patterns':
      console.log('Available Patterns:');
      for (const [category, patterns] of Object.entries(INCIDENT_PATTERNS)) {
        console.log(`\n${category}:`);
        for (const [type, pattern] of Object.entries(patterns)) {
          console.log(`  ${pattern.name}: ${pattern.symptoms.join(', ')}`);
        }
      }
      break;

    case 'stats':
      console.log('RCA Stats:', JSON.stringify(rca.getStats(), null, 2));
      break;

    default:
      console.log('Root Cause Analysis');
      console.log('');
      console.log('Commands:');
      console.log('  analyze   Analyze an incident');
      console.log('  patterns  List available patterns');
      console.log('  stats     Show RCA statistics');
  }
}
