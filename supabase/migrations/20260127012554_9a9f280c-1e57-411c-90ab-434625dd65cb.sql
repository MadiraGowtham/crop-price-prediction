-- Create crops table to store crop information
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🌾',
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'per quintal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crop_prices table to store daily prices
CREATE TABLE public.crop_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id TEXT NOT NULL REFERENCES public.crops(crop_id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  previous_price NUMERIC,
  predicted_price NUMERIC,
  confidence INTEGER DEFAULT 80,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(crop_id, recorded_at)
);

-- Create market_data table for regional prices
CREATE TABLE public.market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id TEXT NOT NULL REFERENCES public.crops(crop_id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  market_name TEXT,
  price NUMERIC NOT NULL,
  change_percent NUMERIC DEFAULT 0,
  volume INTEGER DEFAULT 0,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_history table for historical tracking
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id TEXT NOT NULL REFERENCES public.crops(crop_id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  predicted_price NUMERIC,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(crop_id, recorded_at)
);

-- Enable RLS on all tables
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Create public read policies (crop data should be publicly accessible)
CREATE POLICY "Anyone can view crops" ON public.crops FOR SELECT USING (true);
CREATE POLICY "Anyone can view crop prices" ON public.crop_prices FOR SELECT USING (true);
CREATE POLICY "Anyone can view market data" ON public.market_data FOR SELECT USING (true);
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);

-- Create insert/update policies for authenticated users (admin functionality)
CREATE POLICY "Authenticated users can insert crops" ON public.crops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update crops" ON public.crops FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert crop prices" ON public.crop_prices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update crop prices" ON public.crop_prices FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert market data" ON public.market_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update market data" ON public.market_data FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert price history" ON public.price_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at on crops table
CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.crop_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_data;

-- Insert initial crop data
INSERT INTO public.crops (crop_id, name, icon, category, unit) VALUES
  ('wheat', 'Wheat', '🌾', 'Cereals', 'per quintal'),
  ('rice', 'Rice', '🍚', 'Cereals', 'per quintal'),
  ('cotton', 'Cotton', '☁️', 'Cash Crops', 'per quintal'),
  ('sugarcane', 'Sugarcane', '🎋', 'Cash Crops', 'per quintal'),
  ('soybean', 'Soybean', '🫘', 'Oilseeds', 'per quintal'),
  ('maize', 'Maize', '🌽', 'Cereals', 'per quintal'),
  ('potato', 'Potato', '🥔', 'Vegetables', 'per quintal'),
  ('onion', 'Onion', '🧅', 'Vegetables', 'per quintal'),
  ('tomato', 'Tomato', '🍅', 'Vegetables', 'per quintal'),
  ('groundnut', 'Groundnut', '🥜', 'Oilseeds', 'per quintal');