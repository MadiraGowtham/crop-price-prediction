-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to auto-generate predictions when price is updated
CREATE OR REPLACE FUNCTION public.generate_prediction_on_price_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    price_change NUMERIC;
    new_trend TEXT;
    new_confidence INTEGER;
    new_predicted_price NUMERIC;
BEGIN
    -- Calculate price change percentage
    IF NEW.previous_price IS NOT NULL AND NEW.previous_price > 0 THEN
        price_change := ((NEW.price - NEW.previous_price) / NEW.previous_price) * 100;
    ELSE
        price_change := 0;
    END IF;
    
    -- Determine trend based on price change
    IF price_change > 2 THEN
        new_trend := 'up';
    ELSIF price_change < -2 THEN
        new_trend := 'down';
    ELSE
        new_trend := 'stable';
    END IF;
    
    -- Calculate confidence (higher for stable trends, lower for volatile)
    new_confidence := GREATEST(60, LEAST(95, 85 - ABS(price_change)::INTEGER + FLOOR(RANDOM() * 10)::INTEGER));
    
    -- Predict price with momentum factor
    new_predicted_price := NEW.price * (1 + (price_change / 100) * 0.7 + (RANDOM() - 0.5) * 0.02);
    
    -- Update the prediction fields
    NEW.trend := new_trend;
    NEW.confidence := new_confidence;
    NEW.predicted_price := ROUND(new_predicted_price, 2);
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-generate predictions
CREATE TRIGGER trigger_generate_prediction
BEFORE INSERT OR UPDATE OF price ON public.crop_prices
FOR EACH ROW
EXECUTE FUNCTION public.generate_prediction_on_price_update();