import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CropPrediction {
  crop_id: string;
  price: number;
  previous_price: number;
  predicted_price: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface MarketDataEntry {
  crop_id: string;
  region: string;
  market_name: string;
  price: number;
  change_percent: number;
  volume: number;
}

// Base prices for crops (realistic Indian market prices in INR per quintal)
const basePrices: Record<string, number> = {
  wheat: 2400,
  rice: 3200,
  cotton: 6800,
  sugarcane: 350,
  soybean: 4500,
  maize: 2100,
  potato: 1800,
  onion: 2200,
  tomato: 2800,
  groundnut: 5600,
};

// Seasonal factors (month-based price adjustments)
const seasonalFactors: Record<string, number[]> = {
  wheat: [1.05, 1.08, 1.02, 0.95, 0.90, 0.92, 0.95, 0.98, 1.00, 1.02, 1.05, 1.08],
  rice: [1.00, 1.02, 1.05, 1.08, 1.10, 1.05, 0.95, 0.90, 0.92, 0.95, 0.98, 1.00],
  cotton: [0.95, 0.92, 0.90, 0.92, 0.95, 0.98, 1.00, 1.02, 1.05, 1.08, 1.05, 0.98],
  sugarcane: [1.02, 1.05, 1.08, 1.05, 1.00, 0.95, 0.92, 0.90, 0.92, 0.95, 0.98, 1.00],
  soybean: [0.95, 0.92, 0.90, 0.88, 0.90, 0.95, 1.00, 1.05, 1.08, 1.10, 1.05, 1.00],
  maize: [1.00, 1.02, 1.05, 1.02, 0.98, 0.95, 0.92, 0.90, 0.95, 1.00, 1.05, 1.02],
  potato: [0.85, 0.80, 0.85, 0.95, 1.05, 1.10, 1.15, 1.20, 1.15, 1.05, 0.95, 0.88],
  onion: [0.90, 0.85, 0.80, 0.85, 0.95, 1.10, 1.20, 1.25, 1.20, 1.10, 1.00, 0.95],
  tomato: [1.10, 1.00, 0.85, 0.75, 0.85, 1.00, 1.20, 1.30, 1.25, 1.15, 1.10, 1.05],
  groundnut: [1.00, 1.02, 1.05, 1.02, 0.98, 0.95, 0.92, 0.95, 1.00, 1.05, 1.08, 1.05],
};

// Regional markets with state information
const regionalMarkets: Record<string, { region: string; market: string }[]> = {
  wheat: [
    { region: 'Punjab', market: 'Amritsar Mandi' },
    { region: 'Haryana', market: 'Karnal Mandi' },
    { region: 'Uttar Pradesh', market: 'Lucknow APMC' },
    { region: 'Madhya Pradesh', market: 'Bhopal Mandi' },
  ],
  rice: [
    { region: 'West Bengal', market: 'Kolkata Rice Market' },
    { region: 'Andhra Pradesh', market: 'Guntur APMC' },
    { region: 'Tamil Nadu', market: 'Thanjavur Mandi' },
    { region: 'Punjab', market: 'Ludhiana Grain Market' },
  ],
  cotton: [
    { region: 'Gujarat', market: 'Rajkot Cotton Market' },
    { region: 'Maharashtra', market: 'Nagpur APMC' },
    { region: 'Telangana', market: 'Warangal Mandi' },
    { region: 'Punjab', market: 'Bathinda Market' },
  ],
  sugarcane: [
    { region: 'Maharashtra', market: 'Pune Sugar Market' },
    { region: 'Uttar Pradesh', market: 'Meerut APMC' },
    { region: 'Karnataka', market: 'Belgaum Mandi' },
    { region: 'Tamil Nadu', market: 'Coimbatore Market' },
  ],
  soybean: [
    { region: 'Madhya Pradesh', market: 'Indore Mandi' },
    { region: 'Maharashtra', market: 'Latur APMC' },
    { region: 'Rajasthan', market: 'Kota Market' },
    { region: 'Karnataka', market: 'Gulbarga Mandi' },
  ],
  maize: [
    { region: 'Karnataka', market: 'Davangere APMC' },
    { region: 'Andhra Pradesh', market: 'Guntur Mandi' },
    { region: 'Bihar', market: 'Patna Market' },
    { region: 'Rajasthan', market: 'Udaipur APMC' },
  ],
  potato: [
    { region: 'Uttar Pradesh', market: 'Agra Mandi' },
    { region: 'West Bengal', market: 'Hooghly APMC' },
    { region: 'Punjab', market: 'Jalandhar Market' },
    { region: 'Gujarat', market: 'Deesa Mandi' },
  ],
  onion: [
    { region: 'Maharashtra', market: 'Nashik Lasalgaon' },
    { region: 'Karnataka', market: 'Hubli APMC' },
    { region: 'Madhya Pradesh', market: 'Mandsaur Mandi' },
    { region: 'Rajasthan', market: 'Alwar Market' },
  ],
  tomato: [
    { region: 'Karnataka', market: 'Kolar APMC' },
    { region: 'Andhra Pradesh', market: 'Madanapalle Mandi' },
    { region: 'Maharashtra', market: 'Nashik Market' },
    { region: 'Himachal Pradesh', market: 'Solan APMC' },
  ],
  groundnut: [
    { region: 'Gujarat', market: 'Junagadh Mandi' },
    { region: 'Andhra Pradesh', market: 'Kurnool APMC' },
    { region: 'Tamil Nadu', market: 'Villupuram Market' },
    { region: 'Rajasthan', market: 'Bikaner Mandi' },
  ],
};

function generatePrice(basePrice: number, cropId: string): number {
  const currentMonth = new Date().getMonth();
  const seasonalFactor = seasonalFactors[cropId]?.[currentMonth] || 1;
  
  // Add random daily variance (-3% to +3%)
  const dailyVariance = 1 + (Math.random() - 0.5) * 0.06;
  
  // Add market volatility factor
  const volatility = 1 + (Math.random() - 0.5) * 0.02;
  
  return Math.round(basePrice * seasonalFactor * dailyVariance * volatility);
}

function generatePrediction(currentPrice: number, previousPrice: number, cropId: string): { predicted: number; confidence: number; trend: 'up' | 'down' | 'stable' } {
  const currentMonth = new Date().getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  
  const currentSeasonal = seasonalFactors[cropId]?.[currentMonth] || 1;
  const nextSeasonal = seasonalFactors[cropId]?.[nextMonth] || 1;
  
  // Calculate trend based on seasonal factors and recent price movement
  const seasonalTrend = nextSeasonal / currentSeasonal;
  const recentTrend = currentPrice / previousPrice;
  
  // Combine trends with weights
  const combinedTrend = (seasonalTrend * 0.6) + (recentTrend * 0.4);
  
  // Generate predicted price
  const predicted = Math.round(currentPrice * combinedTrend);
  
  // Calculate confidence based on volatility
  const priceChange = Math.abs((currentPrice - previousPrice) / previousPrice);
  const baseConfidence = 85;
  const volatilityPenalty = Math.min(priceChange * 100, 15);
  const confidence = Math.round(baseConfidence - volatilityPenalty + (Math.random() * 10));
  
  // Determine trend
  const priceDiff = predicted - currentPrice;
  const threshold = currentPrice * 0.01; // 1% threshold
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (priceDiff > threshold) trend = 'up';
  else if (priceDiff < -threshold) trend = 'down';
  
  return { predicted, confidence: Math.min(95, Math.max(70, confidence)), trend };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all crops
    const { data: crops, error: cropsError } = await supabase
      .from('crops')
      .select('crop_id');

    if (cropsError) throw cropsError;

    const today = new Date().toISOString().split('T')[0];
    const cropPredictions: CropPrediction[] = [];
    const marketDataEntries: MarketDataEntry[] = [];

    for (const crop of crops || []) {
      const cropId = crop.crop_id;
      const basePrice = basePrices[cropId] || 2000;

      // Get previous price
      const { data: lastPrice } = await supabase
        .from('crop_prices')
        .select('price')
        .eq('crop_id', cropId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousPrice = lastPrice?.price || generatePrice(basePrice, cropId);
      const currentPrice = generatePrice(basePrice, cropId);
      const prediction = generatePrediction(currentPrice, previousPrice, cropId);

      cropPredictions.push({
        crop_id: cropId,
        price: currentPrice,
        previous_price: previousPrice,
        predicted_price: prediction.predicted,
        confidence: prediction.confidence,
        trend: prediction.trend,
      });

      // Generate market data for regional markets
      const markets = regionalMarkets[cropId] || [];
      for (const market of markets) {
        const regionalVariance = 1 + (Math.random() - 0.5) * 0.1; // ±5% regional variance
        const regionalPrice = Math.round(currentPrice * regionalVariance);
        const changePercent = Number((((regionalPrice - previousPrice) / previousPrice) * 100).toFixed(1));
        const volume = Math.round(5000 + Math.random() * 20000);

        marketDataEntries.push({
          crop_id: cropId,
          region: market.region,
          market_name: market.market,
          price: regionalPrice,
          change_percent: changePercent,
          volume,
        });
      }
    }

    // Upsert crop prices
    for (const pred of cropPredictions) {
      const { error: upsertError } = await supabase
        .from('crop_prices')
        .upsert({
          crop_id: pred.crop_id,
          price: pred.price,
          previous_price: pred.previous_price,
          predicted_price: pred.predicted_price,
          confidence: pred.confidence,
          trend: pred.trend,
          recorded_at: today,
        }, { 
          onConflict: 'crop_id,recorded_at' 
        });

      if (upsertError) {
        console.error(`Error upserting price for ${pred.crop_id}:`, upsertError);
      }

      // Also add to price history
      await supabase
        .from('price_history')
        .upsert({
          crop_id: pred.crop_id,
          price: pred.price,
          predicted_price: pred.predicted_price,
          recorded_at: today,
        }, {
          onConflict: 'crop_id,recorded_at'
        });
    }

    // Delete old market data for today and insert new
    await supabase
      .from('market_data')
      .delete()
      .eq('recorded_at', today);

    const { error: marketError } = await supabase
      .from('market_data')
      .insert(marketDataEntries.map(entry => ({
        ...entry,
        recorded_at: today,
      })));

    if (marketError) {
      console.error('Error inserting market data:', marketError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Predictions generated successfully',
        predictions: cropPredictions.length,
        marketData: marketDataEntries.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating predictions:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
