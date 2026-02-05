import { Crop, PriceHistory, MarketData } from '@/types/crop';

export const crops: Crop[] = [
  {
    id: 'wheat',
    name: 'Wheat',
    icon: '🌾',
    currentPrice: 2450,
    previousPrice: 2380,
    unit: 'per quintal',
    category: 'Cereals',
    predictedPrice: 2520,
    confidence: 87,
    trend: 'up',
  },
  {
    id: 'rice',
    name: 'Rice',
    icon: '🍚',
    currentPrice: 3200,
    previousPrice: 3150,
    unit: 'per quintal',
    category: 'Cereals',
    predictedPrice: 3280,
    confidence: 91,
    trend: 'up',
  },
  {
    id: 'cotton',
    name: 'Cotton',
    icon: '☁️',
    currentPrice: 6800,
    previousPrice: 7100,
    unit: 'per quintal',
    category: 'Cash Crops',
    predictedPrice: 6650,
    confidence: 78,
    trend: 'down',
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    icon: '🎋',
    currentPrice: 350,
    previousPrice: 340,
    unit: 'per quintal',
    category: 'Cash Crops',
    predictedPrice: 365,
    confidence: 84,
    trend: 'up',
  },
  {
    id: 'soybean',
    name: 'Soybean',
    icon: '🫘',
    currentPrice: 4500,
    previousPrice: 4600,
    unit: 'per quintal',
    category: 'Oilseeds',
    predictedPrice: 4420,
    confidence: 82,
    trend: 'down',
  },
  {
    id: 'maize',
    name: 'Maize',
    icon: '🌽',
    currentPrice: 2100,
    previousPrice: 2050,
    unit: 'per quintal',
    category: 'Cereals',
    predictedPrice: 2180,
    confidence: 89,
    trend: 'up',
  },
  {
    id: 'potato',
    name: 'Potato',
    icon: '🥔',
    currentPrice: 1800,
    previousPrice: 1750,
    unit: 'per quintal',
    category: 'Vegetables',
    predictedPrice: 1850,
    confidence: 85,
    trend: 'up',
  },
  {
    id: 'onion',
    name: 'Onion',
    icon: '🧅',
    currentPrice: 2200,
    previousPrice: 2400,
    unit: 'per quintal',
    category: 'Vegetables',
    predictedPrice: 2050,
    confidence: 76,
    trend: 'down',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    icon: '🍅',
    currentPrice: 2800,
    previousPrice: 2650,
    unit: 'per quintal',
    category: 'Vegetables',
    predictedPrice: 2950,
    confidence: 73,
    trend: 'up',
  },
  {
    id: 'groundnut',
    name: 'Groundnut',
    icon: '🥜',
    currentPrice: 5600,
    previousPrice: 5500,
    unit: 'per quintal',
    category: 'Oilseeds',
    predictedPrice: 5750,
    confidence: 86,
    trend: 'up',
  },
];

export const generatePriceHistory = (cropId: string): PriceHistory[] => {
  const crop = crops.find(c => c.id === cropId);
  if (!crop) return [];

  const basePrice = crop.currentPrice;
  const history: PriceHistory[] = [];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const variance = (Math.random() - 0.5) * basePrice * 0.1;
    const price = Math.round(basePrice + variance - (i * 2));
    
    const predictedVariance = (Math.random() - 0.5) * basePrice * 0.05;
    const predicted = i < 7 ? undefined : Math.round(price + predictedVariance);

    history.push({
      date: date.toISOString().split('T')[0],
      price,
      predicted,
    });
  }

  // Add future predictions
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const trendFactor = crop.trend === 'up' ? 1.002 : crop.trend === 'down' ? 0.998 : 1;
    const lastPrice = history[history.length - 1].price;
    const predictedPrice = Math.round(lastPrice * Math.pow(trendFactor, i) + (Math.random() - 0.5) * 50);

    history.push({
      date: date.toISOString().split('T')[0],
      price: undefined as any,
      predicted: predictedPrice,
    });
  }

  return history;
};

export const marketData: MarketData[] = [
  { crop: 'Wheat', region: 'Punjab', price: 2480, change: 2.8, volume: 15000 },
  { crop: 'Rice', region: 'West Bengal', price: 3250, change: 1.5, volume: 12000 },
  { crop: 'Cotton', region: 'Gujarat', price: 6750, change: -4.2, volume: 8500 },
  { crop: 'Sugarcane', region: 'Maharashtra', price: 355, change: 3.1, volume: 25000 },
  { crop: 'Soybean', region: 'Madhya Pradesh', price: 4480, change: -2.1, volume: 9000 },
  { crop: 'Maize', region: 'Karnataka', price: 2120, change: 2.4, volume: 11000 },
  { crop: 'Potato', region: 'Uttar Pradesh', price: 1820, change: 2.9, volume: 18000 },
  { crop: 'Onion', region: 'Maharashtra', price: 2150, change: -8.3, volume: 14000 },
];

export const categories = ['All', 'Cereals', 'Cash Crops', 'Oilseeds', 'Vegetables'];

export const predictionFactors = [
  'Historical price patterns',
  'Seasonal demand fluctuations',
  'Weather forecast analysis',
  'Supply chain indicators',
  'Government policy impacts',
  'International market trends',
];
