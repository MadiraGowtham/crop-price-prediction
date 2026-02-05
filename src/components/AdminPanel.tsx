import { useState, useEffect } from 'react';
import { Save, RefreshCw, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGeneratePredictions } from '@/hooks/useCropData';

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

interface MarketDataRow {
  id: string;
  crop_id: string;
  region: string;
  market_name: string | null;
  price: number;
  change_percent: number | null;
  volume: number | null;
  recorded_at: string;
}

interface Crop {
  crop_id: string;
  name: string;
  icon: string;
  category: string;
}

export const AdminPanel = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [cropPrices, setCropPrices] = useState<CropPrice[]>([]);
  const [marketData, setMarketData] = useState<MarketDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Price form state
  const [selectedCrop, setSelectedCrop] = useState('');
  const [priceForm, setPriceForm] = useState({
    price: '',
    predicted_price: '',
    confidence: '',
    trend: 'stable',
  });
  
  // Market data form state
  const [marketForm, setMarketForm] = useState({
    crop_id: '',
    region: '',
    market_name: '',
    price: '',
    change_percent: '',
    volume: '',
  });
  
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [isMarketDialogOpen, setIsMarketDialogOpen] = useState(false);
  
  const generatePredictions = useGeneratePredictions();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cropsRes, pricesRes, marketRes] = await Promise.all([
        supabase.from('crops').select('*').order('name'),
        supabase.from('crop_prices').select('*').order('recorded_at', { ascending: false }),
        supabase.from('market_data').select('*').order('recorded_at', { ascending: false }).limit(100),
      ]);

      if (cropsRes.data) setCrops(cropsRes.data as Crop[]);
      if (pricesRes.data) setCropPrices(pricesRes.data as CropPrice[]);
      if (marketRes.data) setMarketData(marketRes.data as MarketDataRow[]);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async () => {
    if (!selectedCrop || !priceForm.price) {
      toast.error('Please select a crop and enter a price');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current price to set as previous
      const existingPrice = cropPrices.find(p => p.crop_id === selectedCrop);
      
      const { error } = await supabase
        .from('crop_prices')
        .upsert({
          crop_id: selectedCrop,
          price: parseFloat(priceForm.price),
          previous_price: existingPrice?.price || parseFloat(priceForm.price),
          predicted_price: priceForm.predicted_price ? parseFloat(priceForm.predicted_price) : null,
          confidence: priceForm.confidence ? parseInt(priceForm.confidence) : 80,
          trend: priceForm.trend,
          recorded_at: today,
        }, {
          onConflict: 'crop_id,recorded_at'
        });

      if (error) throw error;

      // Also add to price history
      await supabase
        .from('price_history')
        .upsert({
          crop_id: selectedCrop,
          price: parseFloat(priceForm.price),
          predicted_price: priceForm.predicted_price ? parseFloat(priceForm.predicted_price) : null,
          recorded_at: today,
        }, {
          onConflict: 'crop_id,recorded_at'
        });

      toast.success('Price updated successfully!');
      fetchData();
      setPriceForm({ price: '', predicted_price: '', confidence: '', trend: 'stable' });
    } catch (error) {
      toast.error('Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const handleMarketDataSubmit = async () => {
    if (!marketForm.crop_id || !marketForm.region || !marketForm.price) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const data = {
        crop_id: marketForm.crop_id,
        region: marketForm.region.trim(),
        market_name: marketForm.market_name.trim() || null,
        price: parseFloat(marketForm.price),
        change_percent: marketForm.change_percent ? parseFloat(marketForm.change_percent) : 0,
        volume: marketForm.volume ? parseInt(marketForm.volume) : 0,
        recorded_at: today,
      };

      if (editingMarketId) {
        const { error } = await supabase
          .from('market_data')
          .update(data)
          .eq('id', editingMarketId);
        if (error) throw error;
        toast.success('Market data updated!');
      } else {
        const { error } = await supabase
          .from('market_data')
          .insert(data);
        if (error) throw error;
        toast.success('Market data added!');
      }

      setIsMarketDialogOpen(false);
      setEditingMarketId(null);
      setMarketForm({ crop_id: '', region: '', market_name: '', price: '', change_percent: '', volume: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save market data');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMarketData = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('market_data')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleEditMarket = (item: MarketDataRow) => {
    setEditingMarketId(item.id);
    setMarketForm({
      crop_id: item.crop_id,
      region: item.region,
      market_name: item.market_name || '',
      price: item.price.toString(),
      change_percent: item.change_percent?.toString() || '',
      volume: item.volume?.toString() || '',
    });
    setIsMarketDialogOpen(true);
  };

  const handleGenerateAll = async () => {
    try {
      await generatePredictions.mutateAsync();
      toast.success('All predictions regenerated!');
      fetchData();
    } catch (error) {
      toast.error('Failed to generate predictions');
    }
  };

  const getCropName = (cropId: string) => {
    return crops.find(c => c.crop_id === cropId)?.name || cropId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage crop prices and market data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleGenerateAll} disabled={generatePredictions.isPending}>
            {generatePredictions.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate All Predictions
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prices">Crop Prices</TabsTrigger>
          <TabsTrigger value="market">Market Data</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-4">
          {/* Price Update Form */}
          <Card>
            <CardHeader>
              <CardTitle>Update Crop Price</CardTitle>
              <CardDescription>Set current and predicted prices for a crop</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <Label>Current Price (₹/qtl)</Label>
                  <Input
                    type="number"
                    placeholder="2500"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Predicted Price</Label>
                  <Input
                    type="number"
                    placeholder="2600"
                    value={priceForm.predicted_price}
                    onChange={(e) => setPriceForm({ ...priceForm, predicted_price: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confidence (%)</Label>
                  <Input
                    type="number"
                    placeholder="85"
                    min="0"
                    max="100"
                    value={priceForm.confidence}
                    onChange={(e) => setPriceForm({ ...priceForm, confidence: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trend</Label>
                  <Select value={priceForm.trend} onValueChange={(v) => setPriceForm({ ...priceForm, trend: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">📈 Up</SelectItem>
                      <SelectItem value="down">📉 Down</SelectItem>
                      <SelectItem value="stable">➡️ Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handlePriceUpdate} disabled={saving} className="mt-4">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Update Price
              </Button>
            </CardContent>
          </Card>

          {/* Current Prices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Prices</CardTitle>
              <CardDescription>Latest prices for all crops</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">Predicted</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cropPrices.slice(0, 10).map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">{getCropName(price.crop_id)}</TableCell>
                      <TableCell className="text-right">₹{price.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ₹{price.previous_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{price.predicted_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">{price.confidence || '-'}%</TableCell>
                      <TableCell>
                        {price.trend === 'up' ? '📈' : price.trend === 'down' ? '📉' : '➡️'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{price.recorded_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          {/* Market Data Form */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Regional Market Data</CardTitle>
                <CardDescription>Add or edit APMC market prices</CardDescription>
              </div>
              <Dialog open={isMarketDialogOpen} onOpenChange={setIsMarketDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingMarketId(null);
                    setMarketForm({ crop_id: '', region: '', market_name: '', price: '', change_percent: '', volume: '' });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingMarketId ? 'Edit' : 'Add'} Market Data</DialogTitle>
                    <DialogDescription>Enter regional market price information</DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Crop</Label>
                      <Select value={marketForm.crop_id} onValueChange={(v) => setMarketForm({ ...marketForm, crop_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select crop" />
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Region/State</Label>
                        <Input
                          placeholder="Maharashtra"
                          value={marketForm.region}
                          onChange={(e) => setMarketForm({ ...marketForm, region: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Market Name</Label>
                        <Input
                          placeholder="Nashik APMC"
                          value={marketForm.market_name}
                          onChange={(e) => setMarketForm({ ...marketForm, market_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Price (₹/qtl)</Label>
                        <Input
                          type="number"
                          placeholder="2500"
                          value={marketForm.price}
                          onChange={(e) => setMarketForm({ ...marketForm, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Change (%)</Label>
                        <Input
                          type="number"
                          placeholder="2.5"
                          value={marketForm.change_percent}
                          onChange={(e) => setMarketForm({ ...marketForm, change_percent: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Volume (tons)</Label>
                        <Input
                          type="number"
                          placeholder="15000"
                          value={marketForm.volume}
                          onChange={(e) => setMarketForm({ ...marketForm, volume: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMarketDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleMarketDataSubmit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getCropName(item.crop_id)}</TableCell>
                      <TableCell>{item.region}</TableCell>
                      <TableCell className="text-muted-foreground">{item.market_name || '-'}</TableCell>
                      <TableCell className="text-right">₹{item.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.change_percent && item.change_percent >= 0 ? 'text-success' : 'text-destructive'}>
                          {item.change_percent ? `${item.change_percent >= 0 ? '+' : ''}${item.change_percent}%` : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.volume?.toLocaleString() || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMarket(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMarketData(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
