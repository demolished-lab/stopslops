#!/usr/bin/env node
// Semantic Analysis - Understand code meaning
import { getLLMIntegration } from './llm-integration.mjs';
import { getRLM } from './rlm-engine.mjs';

class SemanticAnalysis {
  constructor() {
    this.rlm = null;
    this.llm = null;
    this.patterns = new Map();
    this.analyses = [];
  }

  async initialize() {
    this.rlm = await getRLM();
    this.llm = await getLLMIntegration();
    return this;
  }

  // Analyze code semantics
  async analyzeSemantics(code, context = {}) {
    console.log('\n🧠 Analyzing code semantics...');

    const startTime = Date.now();
    const analysis = {
      id: `semantic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: code.substring(0, 200),
      startTime: new Date().toISOString(),
      semantics: {},
      patterns: [],
      issues: [],
      recommendations: []
    };

    try {
      // Get LLM analysis
      const result = await this.llm.analyzeCode(code, context);

      // Parse LLM response
      const parsed = this.parseAnalysis(result.text);
      analysis.semantics = parsed;
      analysis.patterns = parsed.patterns || [];
      analysis.issues = parsed.issues || [];
      analysis.recommendations = parsed.recommendations || [];

      // Store patterns for future reference
      for (const pattern of analysis.patterns) {
        this.patterns.set(pattern.name, pattern);
      }

    } catch (error) {
      console.log('   LLM analysis failed, using fallback');
      analysis.semantics = this.fallbackAnalysis(code);
    }

    analysis.endTime = new Date().toISOString();
    analysis.duration = Date.now() - startTime;

    // Record in RLM
    await this.rlm.learn({
      type: 'semantic-analysis',
      input: { code: code.substring(0, 100), context },
      output: {
        patterns: analysis.patterns.length,
        issues: analysis.issues.length
      },
      success: analysis.patterns.length > 0 || analysis.issues.length > 0,
      duration: analysis.duration,
      context: { semantic: 'analysis' }
    });

    this.analyses.push(analysis);

    console.log(`   Patterns: ${analysis.patterns.length}`);
    console.log(`   Issues: ${analysis.issues.length}`);
    console.log(`   Recommendations: ${analysis.recommendations.length}`);

    return analysis;
  }

  // Parse LLM analysis response
  parseAnalysis(text) {
    const result = {
      patterns: [],
      issues: [],
      recommendations: [],
      meaning: '',
      intent: '',
      sideEffects: []
    };

    // Extract patterns
    const patternMatches = text.match(/pattern[s]?:?\s*([\s\S]*?)(?=\n\n|issue|recommendation|$)/gi);
    if (patternMatches) {
      for (const match of patternMatches) {
        const lines = match.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.includes('-') || line.includes('*')) {
            result.patterns.push({
              name: line.replace(/^[-*]\s*/, '').trim(),
              confidence: 0.8
            });
          }
        }
      }
    }

    // Extract issues
    const issueMatches = text.match(/issue[s]?:?\s*([\s\S]*?)(?=\n\n|pattern|recommendation|$)/gi);
    if (issueMatches) {
      for (const match of issueMatches) {
        const lines = match.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.includes('-') || line.includes('*')) {
            result.issues.push({
              description: line.replace(/^[-*]\s*/, '').trim(),
              severity: 'medium'
            });
          }
        }
      }
    }

    // Extract recommendations
    const recMatches = text.match(/recommendation[s]?:?\s*([\s\S]*?)(?=\n\n|pattern|issue|$)/gi);
    if (recMatches) {
      for (const match of recMatches) {
        const lines = match.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.includes('-') || line.includes('*')) {
            result.recommendations.push(line.replace(/^[-*]\s*/, '').trim());
          }
        }
      }
    }

    // Extract meaning
    const meaningMatch = text.match(/meaning[:\s]*([\s\S]*?)(?=\n\n|pattern|issue|recommendation|$)/i);
    if (meaningMatch) {
      result.meaning = meaningMatch[1].trim();
    }

    // Extract intent
    const intentMatch = text.match(/intent[:\s]*([\s\S]*?)(?=\n\n|pattern|issue|recommendation|$)/i);
    if (intentMatch) {
      result.intent = intentMatch[1].trim();
    }

    return result;
  }

  // Fallback analysis when LLM fails
  fallbackAnalysis(code) {
    const result = {
      patterns: [],
      issues: [],
      recommendations: [],
      meaning: 'Code analysis',
      intent: 'Unknown'
    };

    // Simple pattern detection
    if (code.includes('function')) {
      result.patterns.push({ name: 'function-definition', confidence: 0.9 });
    }
    if (code.includes('class')) {
      result.patterns.push({ name: 'class-definition', confidence: 0.9 });
    }
    if (code.includes('async')) {
      result.patterns.push({ name: 'async-pattern', confidence: 0.9 });
    }
    if (code.includes('try')) {
      result.patterns.push({ name: 'error-handling', confidence: 0.9 });
    }

    // Simple issue detection
    if (code.includes('var ')) {
      result.issues.push({ description: 'Use const/let instead of var', severity: 'low' });
    }
    if (code.includes('==')) {
      result.issues.push({ description: 'Use === instead of ==', severity: 'low' });
    }

    return result;
  }

  // Understand code intent
  async understandIntent(code) {
    const prompt = `What is the intent/purpose of this code?

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Primary purpose
2. Key functionality
3. Expected behavior
4. Side effects`;

    const result = await this.llm.complete(prompt, { temperature: 0.3 });
    return result.text;
  }

  // Detect code smells
  async detectCodeSmells(code) {
    const prompt = `Detect code smells in this code:

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Code smells found
2. Severity of each
3. How to fix each
4. Prevention strategies`;

    const result = await this.llm.complete(prompt, { temperature: 0.3 });
    return result.text;
  }

  // Suggest improvements
  async suggestImprovements(code, context = {}) {
    const prompt = `Suggest improvements for this code:

Code:
\`\`\`
${code}
\`\`\`

Context: ${JSON.stringify(context)}

Provide:
1. Performance improvements
2. Readability improvements
3. Maintainability improvements
4. Security improvements`;

    const result = await this.llm.complete(prompt, { temperature: 0.4 });
    return result.text;
  }

  // Get statistics
  getStats() {
    return {
      totalAnalyses: this.analyses.length,
      patternsDetected: this.patterns.size,
      issuesFound: this.analyses.reduce((sum, a) => sum + (a.issues?.length || 0), 0)
    };
  }
}

// Singleton instance
let instance = null;

export async function getSemanticAnalysis() {
  if (!instance) {
    instance = new SemanticAnalysis();
    await instance.initialize();
  }
  return instance;
}

export { SemanticAnalysis };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const semantic = await getSemanticAnalysis();

  switch (command) {
    case 'analyze':
      const code = process.argv[3] || 'function add(a, b) { return a + b; }';
      const analysis = await semantic.analyzeSemantics(code);
      console.log('Analysis:', JSON.stringify(analysis, null, 2));
      break;

    case 'intent':
      const intentCode = process.argv[3] || 'function fetchData() { return fetch("/api/data"); }';
      const intent = await semantic.understandIntent(intentCode);
      console.log('Intent:', intent);
      break;

    case 'smells':
      const smellCode = process.argv[3] || 'var x = null; console.log(x.foo);';
      const smells = await semantic.detectCodeSmells(smellCode);
      console.log('Code Smells:', smells);
      break;

    case 'improve':
      const improveCode = process.argv[3] || 'function calc(a, b) { return a + b; }';
      const improvements = await semantic.suggestImprovements(improveCode);
      console.log('Improvements:', improvements);
      break;

    case 'stats':
      console.log('Semantic Stats:', JSON.stringify(semantic.getStats(), null, 2));
      break;

    default:
      console.log('Semantic Analysis');
      console.log('');
      console.log('Commands:');
      console.log('  analyze [code]           Analyze code semantics');
      console.log('  intent [code]            Understand code intent');
      console.log('  smells [code]            Detect code smells');
      console.log('  improve [code]           Suggest improvements');
      console.log('  stats                    Show semantic statistics');
  }
}
