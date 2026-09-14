#!/usr/bin/env node
// Property-Based Testing - Auto-test invariants
import { getRLM } from './rlm-engine.mjs';

class PropertyBasedTesting {
  constructor() {
    this.rlm = null;
    this.properties = new Map();
    this.results = [];
    this.violations = [];
  }

  async initialize() {
    this.rlm = await getRLM();
    return this;
  }

  // Register a property to test
  registerProperty(name, property) {
    this.properties.set(name, {
      name,
      ...property
    });
  }

  // Generate random input based on type
  generateInput(type) {
    switch (type) {
      case 'string':
        const strType = Math.random();
        if (strType < 0.2) return '';
        if (strType < 0.4) return 'a'.repeat(1000);
        return Math.random().toString(36).substring(2);
      
      case 'number':
        const numType = Math.random();
        if (numType < 0.1) return 0;
        if (numType < 0.2) return -0;
        if (numType < 0.3) return Number.MAX_SAFE_INTEGER;
        if (numType < 0.4) return Number.MIN_SAFE_INTEGER;
        if (numType < 0.5) return Infinity;
        if (numType < 0.6) return NaN;
        return Math.random() * 1000 - 500;
      
      case 'boolean':
        return Math.random() > 0.5;
      
      case 'array':
        const arrType = Math.random();
        if (arrType < 0.2) return [];
        if (arrType < 0.4) return new Array(1000).fill(0);
        return [Math.random(), Math.random(), Math.random()];
      
      case 'object':
        const objType = Math.random();
        if (objType < 0.2) return {};
        if (objType < 0.4) return null;
        return { key: Math.random() };
      
      default:
        return null;
    }
  }

  // Test a property with random inputs
  async testProperty(propertyName, fn, options = {}) {
    const property = this.properties.get(propertyName);
    if (!property) {
      throw new Error(`Property not registered: ${propertyName}`);
    }

    const { iterations = 100 } = options;
    console.log(`\n🔍 Testing property: ${propertyName}`);
    console.log(`   Description: ${property.description}`);
    console.log(`   Iterations: ${iterations}`);

    const startTime = Date.now();
    const result = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      property: propertyName,
      startTime: new Date().toISOString(),
      iterations: 0,
      violations: [],
      passed: true
    };

    for (let i = 0; i < iterations; i++) {
      // Generate inputs based on property definition
      const inputs = property.inputs.map(input => this.generateInput(input.type));
      result.iterations++;

      try {
        // Run the function
        const output = await fn(...inputs);

        // Check the property
        const holds = property.check(inputs, output);

        if (!holds) {
          result.violations.push({
            iteration: i,
            inputs,
            output,
            timestamp: new Date().toISOString()
          });
          result.passed = false;
          this.violations.push({ property: propertyName, inputs, output, iteration: i });
        }

      } catch (error) {
        result.violations.push({
          iteration: i,
          inputs,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        result.passed = false;
      }

      // Progress indicator
      if (i % 10 === 0) {
        process.stdout.write(`\r   Progress: ${i}/${iterations}`);
      }
    }

    console.log('\r   Progress: ' + iterations + '/' + iterations);

    result.endTime = new Date().toISOString();
    result.duration = Date.now() - startTime;

    // Record in RLM
    await this.rlm.learn({
      type: 'property-test',
      input: { property: propertyName, options },
      output: {
        violations: result.violations.length,
        passed: result.passed
      },
      success: result.passed,
      duration: result.duration,
      context: { property: propertyName }
    });

    this.results.push(result);

    console.log(`   Result: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`   Violations: ${result.violations.length}`);

    return result;
  }

  // Test multiple properties
  async testSuite(tests) {
    const results = [];

    for (const test of tests) {
      const result = await this.testProperty(test.name, test.fn, test.options);
      results.push(result);
    }

    return results;
  }

  // Get statistics
  getStats() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalViolations = this.violations.length;

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      totalViolations,
      passRate: totalTests > 0 ? passedTests / totalTests : 0
    };
  }

  // Get violation reports
  getViolationReports() {
    return this.violations.map(v => ({
      property: v.property,
      iteration: v.iteration,
      inputs: v.inputs,
      output: v.output,
      error: v.error
    }));
  }
}

// Singleton instance
let instance = null;

export async function getPropertyBasedTesting() {
  if (!instance) {
    instance = new PropertyBasedTesting();
    await instance.initialize();
  }
  return instance;
}

export { PropertyBasedTesting };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const pbt = await getPropertyBasedTesting();

  switch (command) {
    case 'test':
      const testName = process.argv[3] || 'test';
      const iterations = parseInt(process.argv[4]) || 100;
      
      // Register example property
      pbt.registerProperty('always-returns-boolean', {
        description: 'Function always returns boolean',
        inputs: [{ type: 'string' }, { type: 'number' }],
        check: (inputs, output) => typeof output === 'boolean'
      });

      // Example test
      await pbt.testProperty('always-returns-boolean', (str, num) => {
        return Math.random() > 0.5;
      }, { iterations });
      break;

    case 'stats':
      console.log('PBT Stats:', JSON.stringify(pbt.getStats(), null, 2));
      break;

    case 'violations':
      console.log('Violations:', JSON.stringify(pbt.getViolationReports(), null, 2));
      break;

    default:
      console.log('Property-Based Testing');
      console.log('');
      console.log('Commands:');
      console.log('  test [name] [iterations]  Run property test');
      console.log('  stats                     Show PBT statistics');
      console.log('  violations                Show violation reports');
  }
}
