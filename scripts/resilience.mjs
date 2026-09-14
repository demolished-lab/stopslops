// Resilience utilities: retry, circuit breaker, rate limiter
// Enterprise-grade reliability for API calls

// Circuit breaker states
const CLOSED = 'CLOSED';
const OPEN = 'OPEN';
const HALF_OPEN = 'HALF_OPEN';

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitorInterval = options.monitorInterval || 10000; // 10 seconds
    
    this.state = CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }
  
  async execute(fn) {
    if (this.state === OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    if (this.state === HALF_OPEN) {
      this.state = CLOSED;
      this.failureCount = 0;
    }
    this.successCount++;
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
  
  reset() {
    this.state = CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }
}

export class Retryable {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
  }
  
  async execute(fn) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) break;
        if (!this.isRetryable(error)) break;
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  isRetryable(error) {
    if (this.retryableErrors.includes(error.code)) return true;
    if (error.status >= 500) return true;
    if (error.message?.includes('timeout')) return true;
    return false;
  }
  
  calculateDelay(attempt) {
    const delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10;
    this.windowMs = options.windowMs || 60000; // 1 minute
    
    this.requests = [];
  }
  
  async acquire() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await this.sleep(waitTime);
      return this.acquire();
    }
    
    this.requests.push(now);
    return true;
  }
  
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < this.windowMs);
    return {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      currentRequests: recentRequests.length,
      nextAvailable: recentRequests.length < this.maxRequests ? 0 : 
        this.windowMs - (now - recentRequests[0])
    };
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ResilientClient {
  constructor(options = {}) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.retryable = new Retryable(options.retry);
    this.rateLimiter = new RateLimiter(options.rateLimit);
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0
    };
  }
  
  async request(fn) {
    this.metrics.totalRequests++;
    
    await this.rateLimiter.acquire();
    
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.retryable.execute(async (attempt) => {
          if (attempt > 0) this.metrics.retriedRequests++;
          return await fn();
        });
      });
      
      this.metrics.successfulRequests++;
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }
  
  getStatus() {
    return {
      circuitBreaker: this.circuitBreaker.getStatus(),
      rateLimiter: this.rateLimiter.getStatus(),
      metrics: { ...this.metrics }
    };
  }
  
  reset() {
    this.circuitBreaker.reset();
    this.requests = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0
    };
  }
}

export default { CircuitBreaker, Retryable, RateLimiter, ResilientClient };
