import { useState, useEffect } from 'react';
import { Save, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clearModelCache } from '@/lib/mlPrediction';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CropPrice {
  id: string;
  crop_id: string;
  price: number;
  previous_price: number | null;
  predicted_price: number | null;
  confidence: number | null;
  trend: string | null;
  recorded_at: string;
}

interface Crop {
  crop_id: string;
  name: string;
  icon: string;
  category: string;
}

export const AdminPriceManager = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [cropPrices, setCropPrices] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [selectedCrop, setSelectedCrop] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cropsRes, pricesRes] = await Promise.all([
        supabase.from('crops').select('*').order('name'),
        supabase.from('crop_prices').select('*').order('recorded_at', { ascending: false }),
      ]);

      if (cropsRes.data) setCrops(cropsRes.data as Crop[]);
      if (pricesRes.data) setCropPrices(pricesRes.data as CropPrice[]);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async () => {
    if (!selectedCrop || !currentPrice) {
      toast.error('Please select a crop and enter a price');
      return;
    }

    const price = parseFloat(currentPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current price to set as previous
      const existingPrice = cropPrices.find(p => p.crop_id === selectedCrop);
      
      // Only send current price - ML trigger will auto-calculate predictions
      const { data: updatedPrice, error } = await supabase
        .from('crop_prices')
        .upsert({
          crop_id: selectedCrop,
          price: price,
          previous_price: existingPrice?.price || price,
          recorded_at: today,
        }, {
          onConflict: 'crop_id,recorded_at'
        })
        .select()
        .single();

      if (error) throw error;

      // Also add to price history with the predicted price from the trigger
      await supabase
        .from('price_history')
        .upsert({
          crop_id: selectedCrop,
          price: price,
          predicted_price: updatedPrice?.predicted_price || null,
          recorded_at: today,
        }, {
          onConflict: 'crop_id,recorded_at'
        });

      // Clear ML model cache so predictions are regenerated with new data
      clearModelCache();
      
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['priceHistory'] });
      queryClient.invalidateQueries({ queryKey: ['marketData'] });

      toast.success('Price updated! ML model is calculating predictions...');
      fetchData();
      setCurrentPrice('');
      setSelectedCrop('');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const getCropName = (cropId: string) => {
    const crop = crops.find(c => c.crop_id === cropId);
    return crop ? `${crop.icon} ${crop.name}` : cropId;
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get unique latest prices per crop
  const latestPrices = new Map<string, CropPrice>();
  cropPrices.forEach((price) => {
    if (!latestPrices.has(price.crop_id)) {
      latestPrices.set(price.crop_id, price);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Current Price</CardTitle>
          <CardDescription>
            Enter the current market price. Predicted price, trend, and confidence 
            will be automatically calculated by the ML model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Crop</Label>
              <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose crop" />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((crop) => (
                    <SelectItem key={crop.crop_id} value={crop.crop_id}>
                      {crop.icon} {crop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Current Price (₹/quintal)</Label>
              <Input
                type="number"
                placeholder="e.g., 2500"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handlePriceUpdate} 
                disabled={saving || !selectedCrop || !currentPrice}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Price
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Prices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Prices & ML Predictions</CardTitle>
          <CardDescription>
            View all crops with their current prices and ML-generated predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-right">
                  <span className="text-primary">Predicted (ML)</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-primary">Confidence (ML)</span>
                </TableHead>
                <TableHead>
                  <span className="text-primary">Trend (ML)</span>
                </TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(latestPrices.values()).map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{getCropName(price.crop_id)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{price.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {price.previous_price ? `₹${price.previous_price.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-mono">
                      ₹{price.predicted_price?.toLocaleString() || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={price.confidence && price.confidence >= 80 ? 'default' : 'outline'}
                    >
                      {price.confidence || '-'}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(price.trend)}
                      <span className="text-sm capitalize">{price.trend || 'stable'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {price.recorded_at}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
