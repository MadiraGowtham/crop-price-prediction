export interface Crop {
  id: string;
  name: string;
  icon: string;
  currentPrice: number;
  previousPrice: number;
  unit: string;
  category: string;
  predictedPrice: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PriceHistory {
  date: string;
  price: number;
  predicted?: number;
}

export interface MarketData {
  crop: string;
  region: string;
  price: number;
  change: number;
  volume: number;
}

export interface PredictionResult {
  cropId: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
  recommendation: string;
}
