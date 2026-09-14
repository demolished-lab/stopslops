#!/usr/bin/env node
// LLM Integration - GPT/Claude for reasoning
import { getRLM } from './rlm-engine.mjs';

const LLM_PROVIDERS = {
  OPENAI: {
    name: 'openai',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY'
  },
  ANTHROPIC: {
    name: 'anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY'
  },
  LOCAL: {
    name: 'local',
    models: ['llama2', 'mistral', 'codellama'],
    endpoint: 'http://localhost:11434/api/generate',
    envKey: null
  }
};

class LLMIntegration {
  constructor() {
    this.rlm = null;
    this.provider = null;
    this.model = null;
    this.apiKey = null;
    this.cache = new Map();
    this.rateLimiter = {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 60,
      windowMs: 60000
    };
  }

  async initialize() {
    this.rlm = await getRLM();
    this.detectProvider();
    return this;
  }

  detectProvider() {
    // Auto-detect available provider
    for (const [name, provider] of Object.entries(LLM_PROVIDERS)) {
      if (provider.envKey && process.env[provider.envKey]) {
        this.provider = provider;
        this.apiKey = process.env[provider.envKey];
        this.model = provider.models[0];
        console.log(`Using LLM provider: ${name}`);
        return;
      }
    }

    // Fallback to local
    this.provider = LLM_PROVIDERS.LOCAL;
    this.model = 'llama2';
    console.log('Using local LLM (no API key found)');
  }

  // Rate limiting
  checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimiter.windowStart > this.rateLimiter.windowMs) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.windowStart = now;
    }

    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    this.rateLimiter.requests++;
  }

  // Cache key generation
  getCacheKey(prompt, options) {
    return `${this.model}:${JSON.stringify(prompt)}:${JSON.stringify(options)}`;
  }

  // Main completion method
  async complete(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      useCache = true
    } = options;

    // Check cache
    const cacheKey = this.getCacheKey(prompt, options);
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check rate limit
    this.checkRateLimit();

    try {
      let result;

      if (this.provider.name === 'openai') {
        result = await this.callOpenAI(prompt, options);
      } else if (this.provider.name === 'anthropic') {
        result = await this.callAnthropic(prompt, options);
      } else {
        result = await this.callLocal(prompt, options);
      }

      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, result);
      }

      // Record in RLM
      await this.rlm.learn({
        type: 'llm-completion',
        input: { prompt: prompt.substring(0, 100), model: this.model },
        output: { tokens: result.usage?.totalTokens || 0 },
        success: true,
        duration: result.duration,
        context: { llm: this.provider.name }
      });

      return result;

    } catch (error) {
      // Record failure
      await this.rlm.learn({
        type: 'llm-completion',
        input: { prompt: prompt.substring(0, 100), model: this.model },
        output: { error: error.message },
        success: false,
        duration: 0,
        context: { llm: this.provider.name }
      });

      throw error;
    }
  }

  // OpenAI API call
  async callOpenAI(prompt, options) {
    const startTime = Date.now();

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      duration: Date.now() - startTime,
      model: this.model
    };
  }

  // Anthropic API call
  async callAnthropic(prompt, options) {
    const startTime = Date.now();

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      duration: Date.now() - startTime,
      model: this.model
    };
  }

  // Local LLM call
  async callLocal(prompt, options) {
    const startTime = Date.now();

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.response,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      duration: Date.now() - startTime,
      model: this.model
    };
  }

  // Analyze code
  async analyzeCode(code, context = {}) {
    const prompt = `Analyze this code for issues, improvements, and patterns:

Code:
\`\`\`
${code}
\`\`\`

Context: ${JSON.stringify(context)}

Provide:
1. Issues found
2. Suggested improvements
3. Patterns detected
4. Security concerns
5. Performance issues`;

    return this.complete(prompt, { temperature: 0.3 });
  }

  // Generate fix
  async generateFix(code, issue) {
    const prompt = `Fix this code issue:

Code:
\`\`\`
${code}
\`\`\`

Issue: ${issue}

Provide the fixed code with explanation.`;

    return this.complete(prompt, { temperature: 0.2 });
  }

  // Predict failure
  async predictFailure(metrics) {
    const prompt = `Based on these metrics, predict potential failures:

Metrics: ${JSON.stringify(metrics)}

Provide:
1. Potential failures
2. Probability of each
3. Recommended actions
4. Prevention strategies`;

    return this.complete(prompt, { temperature: 0.4 });
  }

  // Make decision
  async makeDecision(context, options) {
    const prompt = `Make a decision based on this context:

Context: ${JSON.stringify(context)}

Options: ${JSON.stringify(options)}

Provide:
1. Recommended option
2. Reasoning
3. Risks
4. Mitigation strategies`;

    return this.complete(prompt, { temperature: 0.3 });
  }

  // Generate test cases
  async generateTests(code) {
    const prompt = `Generate comprehensive test cases for this code:

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Unit tests
2. Edge cases
3. Integration tests
4. Performance tests`;

    return this.complete(prompt, { temperature: 0.5 });
  }

  // Get statistics
  getStats() {
    return {
      provider: this.provider?.name || 'none',
      model: this.model || 'none',
      cacheSize: this.cache.size,
      rateLimiter: { ...this.rateLimiter }
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let instance = null;

export async function getLLMIntegration() {
  if (!instance) {
    instance = new LLMIntegration();
    await instance.initialize();
  }
  return instance;
}

export { LLMIntegration, LLM_PROVIDERS };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const llm = await getLLMIntegration();

  switch (command) {
    case 'analyze':
      const code = process.argv[3] || 'console.log("hello")';
      const result = await llm.analyzeCode(code);
      console.log('Analysis:', result.text);
      break;

    case 'fix':
      const badCode = process.argv[3] || 'var x = null; console.log(x.foo)';
      const issue = process.argv[4] || 'null reference';
      const fix = await llm.generateFix(badCode, issue);
      console.log('Fix:', fix.text);
      break;

    case 'predict':
      const metrics = { cpu: 85, memory: 70, errors: 5 };
      const prediction = await llm.predictFailure(metrics);
      console.log('Prediction:', prediction.text);
      break;

    case 'stats':
      console.log('LLM Stats:', JSON.stringify(llm.getStats(), null, 2));
      break;

    default:
      console.log('LLM Integration');
      console.log('');
      console.log('Commands:');
      console.log('  analyze [code]           Analyze code');
      console.log('  fix [code] [issue]       Generate fix');
      console.log('  predict [metrics]        Predict failures');
      console.log('  stats                    Show LLM statistics');
  }
}
