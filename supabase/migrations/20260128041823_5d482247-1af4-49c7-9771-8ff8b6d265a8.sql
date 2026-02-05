-- Add delete policy for market_data
CREATE POLICY "Authenticated users can delete market data" 
ON public.market_data 
FOR DELETE 
USING (auth.uid() IS NOT NULL);