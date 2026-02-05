import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { Crop, MarketData, PriceHistory } from '@/types/crop';

interface CropPriceRow {
  crop_id: string;
  price: number;
  previous_price: number | null;
  predicted_price: number | null;
  confidence: number | null;
  trend: string | null;
  recorded_at: string;
}

interface CropRow {
  crop_id: string;
  name: string;
  icon: string;
  category: string;
  unit: string;
}

interface MarketDataRow {
  crop_id: string;
  region: string;
  market_name: string | null;
  price: number;
  change_percent: number | null;
  volume: number | null;
}

interface PriceHistoryRow {
  crop_id: string;
  price: number;
  predicted_price: number | null;
  recorded_at: string;
}

// Fetch all crops with current prices
export function useCrops() {
  return useQuery({
    queryKey: ['crops'],
    queryFn: async (): Promise<Crop[]> => {
      // Fetch crops
      const { data: cropsData, error: cropsError } = await supabase
        .from('crops')
        .select('*');

      if (cropsError) throw cropsError;

      // Fetch latest prices for each crop
      const { data: pricesData, error: pricesError } = await supabase
        .from('crop_prices')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (pricesError) throw pricesError;

      // Get unique latest prices per crop
      const latestPrices = new Map<string, CropPriceRow>();
      (pricesData as CropPriceRow[])?.forEach((price) => {
        if (!latestPrices.has(price.crop_id)) {
          latestPrices.set(price.crop_id, price);
        }
      });

      // Combine crops with prices
      const crops: Crop[] = ((cropsData as CropRow[]) || []).map((crop) => {
        const price = latestPrices.get(crop.crop_id);
        return {
          id: crop.crop_id,
          name: crop.name,
          icon: crop.icon,
          category: crop.category,
          unit: crop.unit,
          currentPrice: price?.price || 0,
          previousPrice: price?.previous_price || 0,
          predictedPrice: price?.predicted_price || 0,
          confidence: price?.confidence || 80,
          trend: (price?.trend as 'up' | 'down' | 'stable') || 'stable',
        };
      });

      return crops;
    },
  });
}

// Fetch market data
export function useMarketData() {
  return useQuery({
    queryKey: ['marketData'],
    queryFn: async (): Promise<MarketData[]> => {
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return ((data as MarketDataRow[]) || []).map((item) => ({
        crop: item.crop_id.charAt(0).toUpperCase() + item.crop_id.slice(1),
        region: item.region,
        price: item.price,
        change: item.change_percent || 0,
        volume: item.volume || 0,
      }));
    },
  });
}

// Fetch price history for a specific crop
export function usePriceHistory(cropId: string) {
  return useQuery({
    queryKey: ['priceHistory', cropId],
    queryFn: async (): Promise<PriceHistory[]> => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('crop_id', cropId)
        .order('recorded_at', { ascending: true })
        .limit(45);

      if (error) throw error;

      return ((data as PriceHistoryRow[]) || []).map((item) => ({
        date: item.recorded_at,
        price: item.price,
        predicted: item.predicted_price || undefined,
      }));
    },
    enabled: !!cropId,
  });
}

// Generate/refresh predictions
export function useGeneratePredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-predictions');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['marketData'] });
      queryClient.invalidateQueries({ queryKey: ['priceHistory'] });
    },
  });
}

// Subscribe to realtime updates
export function useCropRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('crop-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crop_prices',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['crops'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_data',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['marketData'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Categories
export const categories = ['All', 'Cereals', 'Cash Crops', 'Oilseeds', 'Vegetables'];

export const predictionFactors = [
  'Historical price patterns',
  'Seasonal demand fluctuations',
  'Weather forecast analysis',
  'Supply chain indicators',
  'Government policy impacts',
  'International market trends',
];
