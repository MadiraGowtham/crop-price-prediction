/**
 * TensorFlow.js-based Machine Learning Prediction Engine
 * Implements a neural network approach inspired by Random Forest ensemble methods
 * for crop price prediction using historical data patterns
 */

import * as tf from '@tensorflow/tfjs';
import { PriceHistory, Crop } from '@/types/crop';

// Model cache to avoid retraining
const modelCache = new Map<string, tf.Sequential>();

/**
 * Normalize data to 0-1 range for neural network processing
 */
function normalizeData(data: number[], min: number, max: number): number[] {
  const range = max - min || 1;
  return data.map(v => (v - min) / range);
}

/**
 * Denormalize predictions back to original price range
 */
function denormalizeData(data: number[], min: number, max: number): number[] {
  const range = max - min || 1;
  return data.map(v => v * range + min);
}

/**
 * Create sliding window sequences for time series prediction
 */
function createSequences(data: number[], windowSize: number): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  
  for (let i = 0; i < data.length - windowSize; i++) {
    X.push(data.slice(i, i + windowSize));
    y.push(data[i + windowSize]);
  }
  
  return { X, y };
}

/**
 * Build and train a neural network model for price prediction
 * Uses multiple dense layers to capture complex price patterns
 */
async function buildModel(windowSize: number): Promise<tf.Sequential> {
  const model = tf.sequential();
  
  // Input layer with more neurons for complex pattern recognition
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu',
    inputShape: [windowSize],
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Hidden layers (mimicking Random Forest's multiple decision paths)
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));
  
  model.add(tf.layers.dropout({ rate: 0.1 }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));
  
  // Output layer
  model.add(tf.layers.dense({ units: 1 }));
  
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError',
    metrics: ['mse']
  });
  
  return model;
}

/**
 * Train the model on historical price data
 */
async function trainModel(
  model: tf.Sequential,
  X: number[][],
  y: number[],
  epochs: number = 50
): Promise<void> {
  const xTensor = tf.tensor2d(X);
  const yTensor = tf.tensor2d(y, [y.length, 1]);
  
  await model.fit(xTensor, yTensor, {
    epochs,
    batchSize: Math.min(16, X.length),
    shuffle: true,
    verbose: 0,
    validationSplit: 0.2
  });
  
  xTensor.dispose();
  yTensor.dispose();
}

/**
 * Calculate prediction confidence based on model performance
 */
function calculateConfidence(
  predictions: number[],
  actuals: number[],
  volatility: number
): number {
  if (actuals.length < 2) return 75;
  
  // Calculate MAPE (Mean Absolute Percentage Error)
  let totalError = 0;
  let count = 0;
  
  for (let i = 0; i < Math.min(predictions.length, actuals.length); i++) {
    if (actuals[i] !== 0) {
      totalError += Math.abs((actuals[i] - predictions[i]) / actuals[i]);
      count++;
    }
  }
  
  const mape = count > 0 ? (totalError / count) * 100 : 10;
  
  // Adjust confidence based on volatility
  const volatilityPenalty = Math.min(volatility * 0.5, 15);
  
  // Convert error to confidence (lower error = higher confidence)
  const baseConfidence = Math.max(50, 100 - mape - volatilityPenalty);
  
  return Math.round(Math.min(95, baseConfidence));
}

/**
 * Calculate price volatility as standard deviation percentage
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100;
}

/**
 * Apply seasonal adjustment factors
 */
function applySeasonalFactors(
  predictions: number[],
  currentMonth: number,
  cropCategory: string
): number[] {
  const seasonalMultipliers: Record<string, number[]> = {
    'Cereals': [1.02, 1.01, 0.98, 0.97, 0.96, 0.95, 0.98, 1.00, 1.02, 1.04, 1.03, 1.02],
    'Cash Crops': [0.98, 0.97, 0.99, 1.01, 1.02, 1.03, 1.02, 1.00, 0.98, 0.97, 0.98, 0.99],
    'Vegetables': [1.15, 1.10, 1.00, 0.90, 0.85, 0.88, 0.95, 1.00, 1.05, 1.10, 1.12, 1.15],
    'Oilseeds': [1.01, 1.00, 0.99, 0.98, 0.97, 0.98, 1.00, 1.02, 1.03, 1.02, 1.01, 1.01]
  };
  
  const multipliers = seasonalMultipliers[cropCategory] || seasonalMultipliers['Cereals'];
  
  return predictions.map((p, i) => {
    const monthIndex = (currentMonth + i) % 12;
    return Math.round(p * multipliers[monthIndex]);
  });
}

export interface MLPredictionResult {
  predictions: number[];
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  movingAverage: number[];
  upperBand: number[];
  lowerBand: number[];
  factors: string[];
}

/**
 * Main prediction function using TensorFlow.js
 */
export async function predictCropPrices(
  priceHistory: PriceHistory[],
  crop: Crop,
  daysToPredict: number = 14,
  seasonalWeight: number = 0.5,
  trendWeight: number = 0.5
): Promise<MLPredictionResult> {
  const WINDOW_SIZE = 7;
  
  // Extract prices from history
  const prices = priceHistory
    .filter(h => h.price !== undefined && h.price !== null)
    .map(h => h.price);
  
  if (prices.length < WINDOW_SIZE + 2) {
    // Not enough data, return simple extrapolation
    const lastPrice = prices[prices.length - 1] || crop.currentPrice;
    const trend = crop.trend === 'up' ? 1.005 : crop.trend === 'down' ? 0.995 : 1;
    
    const predictions = Array.from({ length: daysToPredict }, (_, i) => 
      Math.round(lastPrice * Math.pow(trend, i + 1))
    );
    
    return {
      predictions,
      confidence: 70,
      trend: crop.trend,
      volatility: 5,
      movingAverage: prices.slice(-14),
      upperBand: predictions.map(p => Math.round(p * 1.05)),
      lowerBand: predictions.map(p => Math.round(p * 0.95)),
      factors: ['Insufficient historical data - using trend extrapolation']
    };
  }
  
  // Normalize the data
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const normalizedPrices = normalizeData(prices, minPrice, maxPrice);
  
  // Create sequences
  const { X, y } = createSequences(normalizedPrices, WINDOW_SIZE);
  
  if (X.length < 3) {
    const lastPrice = prices[prices.length - 1];
    const predictions = Array.from({ length: daysToPredict }, () => lastPrice);
    return {
      predictions,
      confidence: 65,
      trend: 'stable',
      volatility: calculateVolatility(prices),
      movingAverage: prices.slice(-14),
      upperBand: predictions.map(p => Math.round(p * 1.08)),
      lowerBand: predictions.map(p => Math.round(p * 0.92)),
      factors: ['Limited training data - predictions may be less accurate']
    };
  }
  
  // Get or create model
  let model = modelCache.get(crop.id);
  if (!model) {
    model = await buildModel(WINDOW_SIZE);
    await trainModel(model, X, y, 30);
    modelCache.set(crop.id, model);
  }
  
  // Generate predictions
  const predictions: number[] = [];
  let currentWindow = normalizedPrices.slice(-WINDOW_SIZE);
  
  for (let i = 0; i < daysToPredict; i++) {
    const inputTensor = tf.tensor2d([currentWindow]);
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const predValue = (await predictionTensor.data())[0];
    
    predictions.push(predValue);
    currentWindow = [...currentWindow.slice(1), predValue];
    
    inputTensor.dispose();
    predictionTensor.dispose();
  }
  
  // Denormalize predictions
  let finalPredictions = denormalizeData(predictions, minPrice, maxPrice);
  
  // Apply seasonal adjustments based on weight
  const currentMonth = new Date().getMonth();
  if (seasonalWeight > 0) {
    const seasonalPreds = applySeasonalFactors(finalPredictions, currentMonth, crop.category);
    finalPredictions = finalPredictions.map((p, i) => 
      Math.round(p * (1 - seasonalWeight) + seasonalPreds[i] * seasonalWeight)
    );
  }
  
  // Apply trend weight
  const avgChange = prices.length > 1 
    ? (prices[prices.length - 1] - prices[0]) / prices[0] / prices.length
    : 0;
  
  if (trendWeight > 0) {
    finalPredictions = finalPredictions.map((p, i) => 
      Math.round(p * (1 + avgChange * trendWeight * (i + 1)))
    );
  }
  
  // Calculate metrics
  const volatility = calculateVolatility(prices);
  const confidence = calculateConfidence(
    finalPredictions.slice(0, 5),
    prices.slice(-5),
    volatility
  );
  
  // Calculate moving average
  const windowForMA = 7;
  const movingAverage = prices.map((_, i) => {
    const start = Math.max(0, i - windowForMA + 1);
    const slice = prices.slice(start, i + 1);
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
  
  // Calculate Bollinger-style bands
  const bandMultiplier = 1 + (volatility / 100) * 2;
  const upperBand = finalPredictions.map(p => Math.round(p * bandMultiplier));
  const lowerBand = finalPredictions.map(p => Math.round(p / bandMultiplier));
  
  // Determine trend
  const avgPrediction = finalPredictions.reduce((a, b) => a + b, 0) / finalPredictions.length;
  const lastPrice = prices[prices.length - 1];
  const priceChange = ((avgPrediction - lastPrice) / lastPrice) * 100;
  
  const trend: 'up' | 'down' | 'stable' = 
    priceChange > 2 ? 'up' : priceChange < -2 ? 'down' : 'stable';
  
  // Identify prediction factors
  const factors: string[] = [
    'TensorFlow.js neural network analysis',
    `${WINDOW_SIZE}-day sliding window pattern recognition`,
    `${prices.length} historical data points processed`
  ];
  
  if (volatility > 10) {
    factors.push(`High volatility detected (${volatility.toFixed(1)}%)`);
  }
  
  if (seasonalWeight > 0.3) {
    factors.push('Seasonal adjustment factors applied');
  }
  
  if (trendWeight > 0.3) {
    factors.push('Historical trend momentum weighted');
  }
  
  return {
    predictions: finalPredictions.map(p => Math.round(p)),
    confidence,
    trend,
    volatility,
    movingAverage,
    upperBand,
    lowerBand,
    factors
  };
}

/**
 * Calculate correlation between two crop price series
 */
export function calculateCorrelation(prices1: number[], prices2: number[]): number {
  const n = Math.min(prices1.length, prices2.length);
  if (n < 3) return 0;
  
  const mean1 = prices1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = prices2.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = prices1[i] - mean1;
    const diff2 = prices2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denom1 * denom2);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Clear model cache (useful when retraining is needed)
 */
export function clearModelCache(): void {
  modelCache.forEach(model => model.dispose());
  modelCache.clear();
}
