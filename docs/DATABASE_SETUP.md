# CropPrice Database Setup Guide

This guide provides step-by-step instructions for setting up your own Supabase database from scratch and creating admin credentials.

## Prerequisites

- A Supabase account at [supabase.com](https://supabase.com)
- Access to your Supabase project dashboard
- Your Supabase project URL and anon key

---

## Part 1: Database Schema Setup

Navigate to your Supabase Dashboard → SQL Editor and run the following SQL commands in order.

### Step 1: Create the App Role Enum

```sql
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
```

### Step 2: Create Core Tables

#### 2.1 Crops Table

```sql
-- Create crops table
CREATE TABLE public.crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🌾',
    unit TEXT NOT NULL DEFAULT 'per quintal',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crops
CREATE POLICY "Anyone can view crops" 
ON public.crops FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert crops" 
ON public.crops FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update crops" 
ON public.crops FOR UPDATE 
USING (auth.uid() IS NOT NULL);
```

#### 2.2 Crop Prices Table

```sql
-- Create crop_prices table
CREATE TABLE public.crop_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id TEXT NOT NULL REFERENCES public.crops(crop_id),
    price NUMERIC NOT NULL,
    previous_price NUMERIC,
    predicted_price NUMERIC,
    trend TEXT DEFAULT 'stable',
    confidence INTEGER DEFAULT 80,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crop_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crop_prices
CREATE POLICY "Anyone can view crop prices" 
ON public.crop_prices FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert crop prices" 
ON public.crop_prices FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update crop prices" 
ON public.crop_prices FOR UPDATE 
USING (auth.uid() IS NOT NULL);
```

#### 2.3 Price History Table

```sql
-- Create price_history table
CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id TEXT NOT NULL REFERENCES public.crops(crop_id),
    price NUMERIC NOT NULL,
    predicted_price NUMERIC,
    recorded_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_history
CREATE POLICY "Anyone can view price history" 
ON public.price_history FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert price history" 
ON public.price_history FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
```

#### 2.4 Market Data Table

```sql
-- Create market_data table
CREATE TABLE public.market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id TEXT NOT NULL REFERENCES public.crops(crop_id),
    region TEXT NOT NULL,
    market_name TEXT,
    price NUMERIC NOT NULL,
    volume INTEGER DEFAULT 0,
    change_percent NUMERIC DEFAULT 0,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_data
CREATE POLICY "Anyone can view market data" 
ON public.market_data FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert market data" 
ON public.market_data FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update market data" 
ON public.market_data FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete market data" 
ON public.market_data FOR DELETE 
USING (auth.uid() IS NOT NULL);
```

#### 2.5 User Profiles Table

```sql
-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    farm_name TEXT,
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);
```

#### 2.6 User Roles Table (CRITICAL FOR ADMIN ACCESS)

```sql
-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));
```

### Step 3: Create Database Functions

#### 3.1 Role Checking Function (SECURITY DEFINER)

```sql
-- Create has_role function for secure role checking
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
```

#### 3.2 Updated At Column Function

```sql
-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

#### 3.3 Auto Profile Creation Function

```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;
```

#### 3.4 ML Prediction Generator Function

```sql
-- Function to auto-generate predictions when price is updated
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
```

### Step 4: Create Triggers

```sql
-- Trigger for updating timestamps on crops
CREATE TRIGGER update_crops_updated_at
BEFORE UPDATE ON public.crops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for auto profile creation on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-generating predictions
CREATE TRIGGER trigger_generate_prediction
BEFORE INSERT OR UPDATE ON public.crop_prices
FOR EACH ROW
EXECUTE FUNCTION public.generate_prediction_on_price_update();
```

### Step 5: Insert Sample Crop Data

```sql
-- Insert sample crops
INSERT INTO public.crops (crop_id, name, category, icon, unit) VALUES
('wheat', 'Wheat', 'Cereals', '🌾', 'per quintal'),
('rice', 'Rice', 'Cereals', '🍚', 'per quintal'),
('maize', 'Maize', 'Cereals', '🌽', 'per quintal'),
('cotton', 'Cotton', 'Cash Crops', '🏵️', 'per quintal'),
('sugarcane', 'Sugarcane', 'Cash Crops', '🎋', 'per quintal'),
('soybean', 'Soybean', 'Oilseeds', '🫘', 'per quintal'),
('groundnut', 'Groundnut', 'Oilseeds', '🥜', 'per quintal'),
('tomato', 'Tomato', 'Vegetables', '🍅', 'per quintal'),
('onion', 'Onion', 'Vegetables', '🧅', 'per quintal'),
('potato', 'Potato', 'Vegetables', '🥔', 'per quintal');

-- Insert sample prices
INSERT INTO public.crop_prices (crop_id, price, previous_price) VALUES
('wheat', 2450, 2380),
('rice', 3200, 3150),
('maize', 1850, 1900),
('cotton', 6500, 6300),
('sugarcane', 350, 340),
('soybean', 4800, 4650),
('groundnut', 5500, 5400),
('tomato', 2800, 3200),
('onion', 1800, 1650),
('potato', 1200, 1250);
```

---

## Part 2: Creating Admin Credentials

### Method: Manual Database Entry (Most Secure)

Admin accounts are created by manually adding entries to the `user_roles` table. This prevents unauthorized admin registration.

### Step 1: Create a Regular User Account

First, sign up as a regular user through your application's signup page or directly in Supabase:

**Option A: Through the App**
1. Go to your app's signup page
2. Register with email and password
3. Verify your email if required

**Option B: Through Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter the admin's email and password
4. Click "Create user"

### Step 2: Get the User's UUID

After creating the user, find their UUID:

**In Supabase Dashboard:**
1. Go to Authentication → Users
2. Find the user you just created
3. Copy their UUID (the `id` column)

**Or via SQL:**
```sql
-- Find user by email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@example.com';
```

### Step 3: Assign Admin Role

Run this SQL command in the SQL Editor, replacing `YOUR_USER_UUID` with the actual UUID:

```sql
-- Assign admin role to a user
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID', 'admin');

-- Example with actual UUID:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin');
```

### Step 4: Verify Admin Role

```sql
-- Verify the admin role was assigned
SELECT 
    ur.user_id,
    u.email,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

---

## Part 3: Connect Your External Database

### Step 1: Get Your Supabase Credentials

From your Supabase Dashboard (https://uulabwynrgehamkfhual.supabase.co):

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://uulabwynrgehamkfhual.supabase.co`
   - **anon/public key**: (Copy the anon key)

### Step 2: Update Environment Variables

Create or update your `.env` file:

```env
VITE_SUPABASE_URL=https://uulabwynrgehamkfhual.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=uulabwynrgehamkfhual
```

### Step 3: Update Supabase Client (If Self-Hosting)

If you're deploying outside of Lovable, update `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uulabwynrgehamkfhual.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key_here';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## Part 4: Admin Access

### Accessing Admin Panel

1. Navigate to `/admin-login`
2. Log in with admin credentials
3. You'll be redirected to `/admin` dashboard

### Admin Capabilities

✅ **Admins CAN:**
- Update current crop prices
- Add new crops with current prices
- View all crop data and predictions

❌ **Admins CANNOT:**
- Modify predicted prices (auto-calculated by ML)
- Modify trend values (auto-calculated)
- Modify confidence scores (auto-calculated)

---

## Troubleshooting

### "Access Denied" on Admin Login

1. Verify the user exists in `auth.users`
2. Check if admin role is assigned:
   ```sql
   SELECT * FROM public.user_roles WHERE role = 'admin';
   ```
3. Ensure the `has_role` function exists and is working

### Predictions Not Updating

1. Verify the trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE event_object_table = 'crop_prices';
   ```
2. Check the trigger function for errors

### RLS Policy Errors

1. Ensure RLS is enabled on all tables
2. Verify policies exist:
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

---

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] Admin roles stored in separate `user_roles` table
- [ ] `has_role` function uses `SECURITY DEFINER`
- [ ] No admin registration endpoint (manual only)
- [ ] Prediction fields are read-only for admins
- [ ] Environment variables are not committed to git

---

## Quick Reference: SQL Commands

```sql
-- Check all admins
SELECT u.email, ur.role 
FROM public.user_roles ur 
JOIN auth.users u ON u.id = ur.user_id;

-- Add new admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('uuid-here', 'admin');

-- Remove admin role
DELETE FROM public.user_roles 
WHERE user_id = 'uuid-here' AND role = 'admin';

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies WHERE schemaname = 'public';
```

---

## Appendix A: Current Database Data Export

### A.1 Crops Data

```sql
-- Insert all crops (current data as of Feb 2026)
INSERT INTO public.crops (crop_id, name, icon, category, unit) VALUES
('cotton', 'Cotton', '☁️', 'Cash Crops', 'per quintal'),
('groundnut', 'Groundnut', '🥜', 'Oilseeds', 'per quintal'),
('maize', 'Maize', '🌽', 'Cereals', 'per quintal'),
('onion', 'Onion', '🧅', 'Vegetables', 'per quintal'),
('potato', 'Potato', '🥔', 'Vegetables', 'per quintal'),
('rice', 'Rice', '🍚', 'Cereals', 'per quintal'),
('soybean', 'Soybean', '🫘', 'Oilseeds', 'per quintal'),
('sugarcane', 'Sugarcane', '🎋', 'Cash Crops', 'per quintal'),
('tomato', 'Tomato', '🍅', 'Vegetables', 'per quintal'),
('wheat', 'Wheat', '🌾', 'Cereals', 'per quintal')
ON CONFLICT (crop_id) DO NOTHING;
```

### A.2 Sample Price History Data (30 Days)

```sql
-- Generate 30 days of price history for all crops
DO $$
DECLARE
  crop RECORD;
  base_prices JSONB := '{
    "wheat": 2500,
    "rice": 3300,
    "cotton": 6300,
    "sugarcane": 360,
    "soybean": 4200,
    "maize": 2100,
    "potato": 1500,
    "onion": 1900,
    "tomato": 2800,
    "groundnut": 5700
  }';
  i INT;
  base_price NUMERIC;
  daily_price NUMERIC;
  predicted_price NUMERIC;
BEGIN
  FOR crop IN SELECT crop_id FROM public.crops LOOP
    base_price := (base_prices->>crop.crop_id)::NUMERIC;
    IF base_price IS NULL THEN
      base_price := 2500;
    END IF;
    
    FOR i IN 0..29 LOOP
      daily_price := ROUND(base_price * (1 + (RANDOM() - 0.5) * 0.08));
      predicted_price := ROUND(daily_price * (1 + (RANDOM() - 0.45) * 0.06));
      
      INSERT INTO public.price_history (crop_id, price, predicted_price, recorded_at)
      VALUES (crop.crop_id, daily_price, predicted_price, CURRENT_DATE - i)
      ON CONFLICT (crop_id, recorded_at) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
```

### A.3 Sample Market Data

```sql
-- Insert sample market data for regional markets
INSERT INTO public.market_data (crop_id, region, market_name, price, change_percent, volume, recorded_at) VALUES
-- Wheat markets
('wheat', 'Punjab', 'Amritsar Mandi', 2550, 2.1, 15000, CURRENT_DATE),
('wheat', 'Haryana', 'Karnal Mandi', 2480, -1.5, 12000, CURRENT_DATE),
('wheat', 'Uttar Pradesh', 'Lucknow APMC', 2520, 1.8, 18000, CURRENT_DATE),
('wheat', 'Madhya Pradesh', 'Bhopal Mandi', 2460, -0.8, 14000, CURRENT_DATE),
-- Rice markets
('rice', 'West Bengal', 'Kolkata Rice Market', 3350, 1.2, 20000, CURRENT_DATE),
('rice', 'Andhra Pradesh', 'Guntur APMC', 3280, -0.5, 16000, CURRENT_DATE),
('rice', 'Tamil Nadu', 'Thanjavur Mandi', 3420, 2.5, 13000, CURRENT_DATE),
('rice', 'Punjab', 'Ludhiana Grain Market', 3300, 0.8, 17000, CURRENT_DATE),
-- Cotton markets
('cotton', 'Gujarat', 'Rajkot Cotton Market', 6450, 1.5, 8000, CURRENT_DATE),
('cotton', 'Maharashtra', 'Nagpur APMC', 6380, 0.9, 9500, CURRENT_DATE),
('cotton', 'Telangana', 'Warangal Mandi', 6520, 2.2, 7500, CURRENT_DATE),
('cotton', 'Punjab', 'Bathinda Market', 6280, -0.6, 6000, CURRENT_DATE),
-- Tomato markets
('tomato', 'Karnataka', 'Kolar APMC', 2750, -1.8, 11000, CURRENT_DATE),
('tomato', 'Andhra Pradesh', 'Madanapalle Mandi', 2680, -2.5, 14000, CURRENT_DATE),
('tomato', 'Maharashtra', 'Nashik Market', 2820, 0.7, 12500, CURRENT_DATE),
('tomato', 'Himachal Pradesh', 'Solan APMC', 2900, 1.9, 8000, CURRENT_DATE),
-- Onion markets
('onion', 'Maharashtra', 'Nashik Lasalgaon', 1950, 2.8, 25000, CURRENT_DATE),
('onion', 'Karnataka', 'Hubli APMC', 1880, 1.2, 18000, CURRENT_DATE),
('onion', 'Madhya Pradesh', 'Mandsaur Mandi', 1920, 2.0, 16000, CURRENT_DATE),
('onion', 'Rajasthan', 'Alwar Market', 1850, 0.5, 14000, CURRENT_DATE)
ON CONFLICT DO NOTHING;
```

### A.4 Initial Current Prices

```sql
-- Insert current prices (ML trigger will auto-calculate predictions)
INSERT INTO public.crop_prices (crop_id, price, previous_price, recorded_at) VALUES
('wheat', 2576, 2550, CURRENT_DATE),
('rice', 3313, 3280, CURRENT_DATE),
('cotton', 6319, 6280, CURRENT_DATE),
('sugarcane', 362, 358, CURRENT_DATE),
('soybean', 4185, 4150, CURRENT_DATE),
('maize', 2104, 2080, CURRENT_DATE),
('potato', 1477, 1450, CURRENT_DATE),
('onion', 1912, 1880, CURRENT_DATE),
('tomato', 2800, 2750, CURRENT_DATE),
('groundnut', 5742, 5700, CURRENT_DATE)
ON CONFLICT (crop_id, recorded_at) DO UPDATE SET
  price = EXCLUDED.price,
  previous_price = EXCLUDED.previous_price;
```

---

## Appendix B: Frontend-Backend Connection

### B.1 Supabase Client Setup

The frontend connects to the database via `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### B.2 Data Fetching Hooks

Data is fetched using React Query hooks in `src/hooks/useCropData.ts`:

- `useCrops()` - Fetches all crops with current prices
- `usePriceHistory(cropId)` - Fetches 30-day price history for a crop
- `useMarketData()` - Fetches regional market data
- `useGeneratePredictions()` - Triggers edge function to refresh predictions

### B.3 Real-time Updates

Real-time updates are enabled via Supabase Realtime:

```typescript
const channel = supabase
  .channel('crop-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'crop_prices',
  }, () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['crops'] });
  })
  .subscribe();
```

---

## Appendix C: Admin Credentials (Demo)

For demonstration purposes:

| Field | Value |
|-------|-------|
| **Email** | `shreebhagya0909@gmail.com` |
| **Password** | `ABCDabc` |
| **Login URL** | `/admin-login` |

**To create your own admin:**
1. Sign up via the app
2. Get user ID: `SELECT id FROM auth.users WHERE email = 'your@email.com';`
3. Assign admin role: `INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'admin');`
