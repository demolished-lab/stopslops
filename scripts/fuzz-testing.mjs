#!/usr/bin/env node
// Fuzz Testing - Auto-generate inputs to find crashes
import { getRLM } from './rlm-engine.mjs';

class FuzzTesting {
  constructor() {
    this.rlm = null;
    this.generators = new Map();
    this.results = [];
    this.crashes = [];
    this.hangs = [];
  }

  async initialize() {
    this.rlm = await getRLM();
    this.setupGenerators();
    return this;
  }

  setupGenerators() {
    // String generators
    this.generators.set('string', {
      generate: () => this.generateString(),
      variants: ['empty', 'null', 'undefined', 'unicode', 'emoji', 'long', 'special']
    });

    // Number generators
    this.generators.set('number', {
      generate: () => this.generateNumber(),
      variants: ['zero', 'negative', 'max', 'min', 'infinity', 'nan', 'float']
    });

    // Object generators
    this.generators.set('object', {
      generate: () => this.generateObject(),
      variants: ['empty', 'nested', 'circular', 'large', 'null']
    });

    // Array generators
    this.generators.set('array', {
      generate: () => this.generateArray(),
      variants: ['empty', 'large', 'mixed', 'nested', 'sparse']
    });

    // Boolean generators
    this.generators.set('boolean', {
      generate: () => Math.random() > 0.5,
      variants: ['true', 'false']
    });

    // Date generators
    this.generators.set('date', {
      generate: () => this.generateDate(),
      variants: ['past', 'future', 'now', 'invalid']
    });

    // Buffer generators
    this.generators.set('buffer', {
      generate: () => this.generateBuffer(),
      variants: ['empty', 'large', 'binary']
    });
  }

  // Generate random string
  generateString() {
    const type = Math.random();
    if (type < 0.1) return ''; // Empty
    if (type < 0.2) return null; // Null
    if (type < 0.3) return undefined; // Undefined
    if (type < 0.4) return '🔐🔑🛡️'; // Emoji
    if (type < 0.5) return 'a'.repeat(10000); // Long
    if (type < 0.6) return '<script>alert(1)</script>'; // XSS
    if (type < 0.7) return "'; DROP TABLE users; --"; // SQL injection
    if (type < 0.8) return '../../etc/passwd'; // Path traversal
    if (type < 0.9) return 'null\x00byte'; // Null byte

    // Random string
    const length = Math.floor(Math.random() * 100);
    return Math.random().toString(36).substring(2, 2 + length);
  }

  // Generate random number
  generateNumber() {
    const type = Math.random();
    if (type < 0.1) return 0;
    if (type < 0.2) return -0;
    if (type < 0.3) return Number.MAX_SAFE_INTEGER;
    if (type < 0.4) return Number.MIN_SAFE_INTEGER;
    if (type < 0.5) return Infinity;
    if (type < 0.6) return -Infinity;
    if (type < 0.7) return NaN;
    if (type < 0.8) return 0.1 + 0.2; // Floating point precision issue

    return Math.random() * 1000 - 500;
  }

  // Generate random object
  generateObject() {
    const type = Math.random();
    if (type < 0.1) return {};
    if (type < 0.2) return null;
    if (type < 0.3) {
      // Circular reference
      const obj = { a: 1 };
      obj.self = obj;
      return obj;
    }
    if (type < 0.4) {
      // Large object
      const obj = {};
      for (let i = 0; i < 10000; i++) {
        obj[`key${i}`] = i;
      }
      return obj;
    }

    return {
      string: this.generateString(),
      number: this.generateNumber(),
      boolean: Math.random() > 0.5,
      array: [1, 2, 3],
      nested: { deep: { value: 'test' } }
    };
  }

  // Generate random array
  generateArray() {
    const type = Math.random();
    if (type < 0.1) return [];
    if (type < 0.2) return new Array(10000).fill(0);
    if (type < 0.3) return [null, undefined, NaN, Infinity, -Infinity];
    if (type < 0.4) return [[[[[[[[]]]]]]]];
    if (type < 0.5) return new Array(1000); // Sparse array

    const length = Math.floor(Math.random() * 100);
    return Array.from({ length }, () => Math.random());
  }

  // Generate random date
  generateDate() {
    const type = Math.random();
    if (type < 0.2) return new Date(0); // Unix epoch
    if (type < 0.4) return new Date('9999-12-31'); // Far future
    if (type < 0.6) return new Date('0000-01-01'); // Far past
    if (type < 0.8) return new Date('invalid'); // Invalid

    return new Date();
  }

  // Generate random buffer
  generateBuffer() {
    const type = Math.random();
    if (type < 0.2) return Buffer.alloc(0);
    if (type < 0.4) return Buffer.alloc(1024 * 1024); // 1MB

    const length = Math.floor(Math.random() * 1000);
    return Buffer.from(Math.random().toString(36).substring(2, 2 + length));
  }

  // Fuzz test a function
  async fuzzTest(name, fn, options = {}) {
    const {
      iterations = 1000,
      timeout = 5000,
      generators = ['string', 'number', 'object']
    } = options;

    console.log(`\n🔍 Fuzz testing: ${name}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Generators: ${generators.join(', ')}`);

    const startTime = Date.now();
    const result = {
      id: `fuzz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      startTime: new Date().toISOString(),
      iterations: 0,
      crashes: [],
      hangs: [],
      errors: [],
      coverage: new Set()
    };

    for (let i = 0; i < iterations; i++) {
      // Generate random input
      const inputs = generators.map(gen => this.generators.get(gen).generate());
      result.iterations++;

      try {
        // Run with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Hang detected')), timeout);
        });

        const testPromise = fn(...inputs);

        await Promise.race([testPromise, timeoutPromise]);

        // Track coverage
        result.coverage.add(inputs.toString().substring(0, 100));

      } catch (error) {
        if (error.message === 'Hang detected') {
          result.hangs.push({
            iteration: i,
            inputs,
            timestamp: new Date().toISOString()
          });
          this.hangs.push({ name, inputs, iteration: i });
        } else {
          result.crashes.push({
            iteration: i,
            inputs,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
          this.crashes.push({ name, inputs, error: error.message, iteration: i });
        }
      }

      // Progress indicator
      if (i % 100 === 0) {
        process.stdout.write(`\r   Progress: ${i}/${iterations}`);
      }
    }

    console.log('\r   Progress: ' + iterations + '/' + iterations);

    result.endTime = new Date().toISOString();
    result.duration = Date.now() - startTime;
    result.crashRate = result.crashes.length / result.iterations;
    result.hangRate = result.hangs.length / result.iterations;

    // Record in RLM
    await this.rlm.learn({
      type: 'fuzz-test',
      input: { name, options },
      output: {
        crashes: result.crashes.length,
        hangs: result.hangs.length,
        crashRate: result.crashRate,
        hangRate: result.hangRate
      },
      success: result.crashes.length === 0 && result.hangs.length === 0,
      duration: result.duration,
      context: { fuzzTest: name }
    });

    this.results.push(result);

    console.log(`   Results:`);
    console.log(`     Crashes: ${result.crashes.length} (${(result.crashRate * 100).toFixed(2)}%)`);
    console.log(`     Hangs: ${result.hangs.length} (${(result.hangRate * 100).toFixed(2)}%)`);
    console.log(`     Coverage: ${result.coverage.size} unique inputs`);

    return result;
  }

  // Fuzz test multiple functions
  async fuzzTestSuite(tests) {
    const results = [];

    for (const test of tests) {
      const result = await this.fuzzTest(test.name, test.fn, test.options);
      results.push(result);
    }

    return results;
  }

  // Get statistics
  getStats() {
    const totalCrashes = this.crashes.length;
    const totalHangs = this.hangs.length;
    const uniqueCrashes = new Set(this.crashes.map(c => c.error)).size;

    return {
      testsRun: this.results.length,
      totalCrashes,
      totalHangs,
      uniqueCrashes,
      crashRate: this.results.length > 0 ? 
        this.results.reduce((sum, r) => sum + r.crashes.length, 0) / 
        this.results.reduce((sum, r) => sum + r.iterations, 0) : 0
    };
  }

  // Get crash reports
  getCrashReports() {
    return this.crashes.map(crash => ({
      name: crash.name,
      iteration: crash.iteration,
      error: crash.error,
      inputs: crash.inputs,
      timestamp: crash.timestamp
    }));
  }
}

// Singleton instance
let instance = null;

export async function getFuzzTesting() {
  if (!instance) {
    instance = new FuzzTesting();
    await instance.initialize();
  }
  return instance;
}

export { FuzzTesting };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const fuzz = await getFuzzTesting();

  switch (command) {
    case 'test':
      const testName = process.argv[3] || 'test';
      const iterations = parseInt(process.argv[4]) || 100;
      
      // Example fuzz test
      await fuzz.fuzzTest(testName, (input) => {
        if (input === null) throw new Error('Null input');
        if (typeof input === 'string' && input.length > 1000) throw new Error('Input too long');
        return true;
      }, { iterations });
      break;

    case 'stats':
      console.log('Fuzz Stats:', JSON.stringify(fuzz.getStats(), null, 2));
      break;

    case 'crashes':
      console.log('Crash Reports:', JSON.stringify(fuzz.getCrashReports(), null, 2));
      break;

    default:
      console.log('Fuzz Testing');
      console.log('');
      console.log('Commands:');
      console.log('  test [name] [iterations]  Run fuzz test');
      console.log('  stats                     Show fuzz statistics');
      console.log('  crashes                   Show crash reports');
  }
}
