import { useState, useEffect } from 'react';
import { Plus, Loader2, Wheat } from 'lucide-react';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Crop {
  crop_id: string;
  name: string;
  icon: string;
  category: string;
  unit: string;
}

const CROP_ICONS = ['🌾', '🌽', '🍚', '🌿', '🥜', '☕', '🫘', '🧅', '🥔', '🍅', '🌻', '🥬'];
const CATEGORIES = ['Cereals', 'Cash Crops', 'Oilseeds', 'Vegetables', 'Pulses', 'Spices'];

export const AdminCropManager = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [cropForm, setCropForm] = useState({
    name: '',
    icon: '🌾',
    category: '',
    unit: 'per quintal',
    initialPrice: '',
  });

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crops')
        .select('*')
        .order('name');

      if (error) throw error;
      setCrops(data as Crop[]);
    } catch (error) {
      toast.error('Failed to fetch crops');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = async () => {
    if (!cropForm.name || !cropForm.category || !cropForm.initialPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const price = parseFloat(cropForm.initialPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid initial price');
      return;
    }

    // Generate crop_id from name
    const cropId = cropForm.name.toLowerCase().replace(/\s+/g, '_');

    // Check if crop already exists
    const existingCrop = crops.find(c => c.crop_id === cropId);
    if (existingCrop) {
      toast.error('A crop with this name already exists');
      return;
    }

    setSaving(true);
    try {
      // Add the crop
      const { error: cropError } = await supabase
        .from('crops')
        .insert({
          crop_id: cropId,
          name: cropForm.name.trim(),
          icon: cropForm.icon,
          category: cropForm.category,
          unit: cropForm.unit,
        });

      if (cropError) throw cropError;

      // Add initial price (ML trigger will calculate predictions)
      const today = new Date().toISOString().split('T')[0];
      const { error: priceError } = await supabase
        .from('crop_prices')
        .insert({
          crop_id: cropId,
          price: price,
          previous_price: price,
          recorded_at: today,
        });

      if (priceError) throw priceError;

      // Add to price history
      await supabase
        .from('price_history')
        .insert({
          crop_id: cropId,
          price: price,
          recorded_at: today,
        });

      toast.success(`${cropForm.name} added successfully! ML predictions will be generated.`);
      setIsDialogOpen(false);
      setCropForm({ name: '', icon: '🌾', category: '', unit: 'per quintal', initialPrice: '' });
      fetchCrops();
    } catch (error) {
      console.error('Error adding crop:', error);
      toast.error('Failed to add crop');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Crop Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Add New Crop</CardTitle>
            <CardDescription>
              Add a new crop with its initial price. ML predictions will be auto-generated.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Crop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Crop</DialogTitle>
                <DialogDescription>
                  Enter crop details and initial market price
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-2">
                    <Label>Crop Name *</Label>
                    <Input
                      placeholder="e.g., Soybean"
                      value={cropForm.name}
                      onChange={(e) => setCropForm({ ...cropForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select 
                      value={cropForm.icon} 
                      onValueChange={(v) => setCropForm({ ...cropForm, icon: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CROP_ICONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={cropForm.category} 
                    onValueChange={(v) => setCropForm({ ...cropForm, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Initial Price (₹/quintal) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 4500"
                    value={cropForm.initialPrice}
                    onChange={(e) => setCropForm({ ...cropForm, initialPrice: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCrop} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Crop
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Crops Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Crops</CardTitle>
          <CardDescription>
            {crops.length} crops in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crops.map((crop) => (
                <TableRow key={crop.crop_id}>
                  <TableCell className="text-2xl">{crop.icon}</TableCell>
                  <TableCell className="font-medium">{crop.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {crop.crop_id}
                  </TableCell>
                  <TableCell>{crop.category}</TableCell>
                  <TableCell className="text-muted-foreground">{crop.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
