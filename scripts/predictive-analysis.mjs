#!/usr/bin/env node
// Predictive Analysis - Predict failures before they happen
import { getLLMIntegration } from './llm-integration.mjs';
import { getRLM } from './rlm-engine.mjs';

class PredictiveAnalysis {
  constructor() {
    this.rlm = null;
    this.llm = null;
    this.predictions = [];
    this.metrics = new Map();
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 70, critical: 90 },
      disk: { warning: 80, critical: 95 },
      errorRate: { warning: 0.01, critical: 0.05 },
      latency: { warning: 1000, critical: 5000 }
    };
  }

  async initialize() {
    this.rlm = await getRLM();
    this.llm = await getLLMIntegration();
    return this;
  }

  // Record metrics
  recordMetrics(metrics) {
    const timestamp = Date.now();
    for (const [key, value] of Object.entries(metrics)) {
      if (!this.metrics.has(key)) {
        this.metrics.set(key, []);
      }
      this.metrics.get(key).push({ value, timestamp });

      // Keep last 1000 data points
      if (this.metrics.get(key).length > 1000) {
        this.metrics.get(key).shift();
      }
    }
  }

  // Analyze trends
  analyzeTrends(metricName) {
    const data = this.metrics.get(metricName);
    if (!data || data.length < 10) {
      return { trend: 'insufficient-data', slope: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumXX = x.reduce((a, xi) => a + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * i + intercept;
      return sum + (yi - predicted) ** 2;
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    let trend = 'stable';
    if (slope > 0.1) trend = 'increasing';
    else if (slope < -0.1) trend = 'decreasing';

    return {
      trend,
      slope,
      intercept,
      rSquared,
      confidence: rSquared,
      nextValue: slope * n + intercept
    };
  }

  // Predict failure
  async predictFailure(metricName) {
    const trend = this.analyzeTrends(metricName);
    const threshold = this.thresholds[metricName];

    if (!threshold || trend.trend === 'insufficient-data') {
      return {
        metric: metricName,
        prediction: 'insufficient-data',
        probability: 0,
        timeframe: 'unknown'
      };
    }

    // Calculate when threshold will be breached
    let timeframe = 'never';
    let probability = 0;

    if (trend.slope > 0) {
      const stepsToBreach = (threshold.critical - trend.intercept) / trend.slope;
      if (stepsToBreach > 0) {
        timeframe = `${Math.round(stepsToBreach)} steps`;
        probability = Math.min(0.95, trend.confidence * (1 - stepsToBreach / 100));
      }
    }

    const prediction = {
      metric: metricName,
      currentValue: this.metrics.get(metricName)?.slice(-1)[0]?.value || 0,
      trend: trend.trend,
      slope: trend.slope,
      threshold: threshold.critical,
      timeframe,
      probability,
      confidence: trend.confidence,
      timestamp: new Date().toISOString()
    };

    // Use LLM for advanced prediction
    try {
      const metrics = {
        [metricName]: prediction.currentValue,
        trend: trend.trend,
        slope: trend.slope
      };

      const llmResult = await this.llm.predictFailure(metrics);
      prediction.llmAnalysis = llmResult.text;
    } catch (error) {
      // Continue without LLM analysis
    }

    // Record in RLM
    await this.rlm.learn({
      type: 'predictive-analysis',
      input: { metric: metricName, trend },
      output: { prediction: prediction.timeframe, probability: prediction.probability },
      success: prediction.probability > 0,
      duration: 0,
      context: { predictive: metricName }
    });

    this.predictions.push(prediction);
    return prediction;
  }

  // Predict all metrics
  async predictAll() {
    const predictions = [];

    for (const metricName of this.metrics.keys()) {
      const prediction = await this.predictFailure(metricName);
      predictions.push(prediction);
    }

    return predictions;
  }

  // Get risk assessment
  getRiskAssessment() {
    const highRisk = this.predictions.filter(p => p.probability > 0.7);
    const mediumRisk = this.predictions.filter(p => p.probability > 0.3 && p.probability <= 0.7);
    const lowRisk = this.predictions.filter(p => p.probability <= 0.3);

    return {
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
      lowRisk: lowRisk.length,
      totalPredictions: this.predictions.length,
      overallRisk: highRisk.length > 0 ? 'high' : mediumRisk.length > 0 ? 'medium' : 'low'
    };
  }

  // Get statistics
  getStats() {
    return {
      metricsTracked: this.metrics.size,
      totalPredictions: this.predictions.length,
      riskAssessment: this.getRiskAssessment()
    };
  }
}

// Singleton instance
let instance = null;

export async function getPredictiveAnalysis() {
  if (!instance) {
    instance = new PredictiveAnalysis();
    await instance.initialize();
  }
  return instance;
}

export { PredictiveAnalysis };

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];
  const predictive = await getPredictiveAnalysis();

  switch (command) {
    case 'record':
      const metrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        errorRate: Math.random() * 0.1
      };
      predictive.recordMetrics(metrics);
      console.log('Recorded metrics:', metrics);
      break;

    case 'predict':
      const metric = process.argv[3] || 'cpu';
      const prediction = await predictive.predictFailure(metric);
      console.log('Prediction:', JSON.stringify(prediction, null, 2));
      break;

    case 'predict-all':
      const predictions = await predictive.predictAll();
      console.log('All Predictions:', JSON.stringify(predictions, null, 2));
      break;

    case 'risk':
      console.log('Risk Assessment:', JSON.stringify(predictive.getRiskAssessment(), null, 2));
      break;

    case 'stats':
      console.log('Predictive Stats:', JSON.stringify(predictive.getStats(), null, 2));
      break;

    default:
      console.log('Predictive Analysis');
      console.log('');
      console.log('Commands:');
      console.log('  record                  Record metrics');
      console.log('  predict [metric]        Predict failure for metric');
      console.log('  predict-all             Predict all metrics');
      console.log('  risk                    Get risk assessment');
      console.log('  stats                   Show predictive statistics');
  }
}
