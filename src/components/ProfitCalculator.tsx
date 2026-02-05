import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, IndianRupee } from 'lucide-react';
import { crops } from '@/data/cropData';
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
import { cn } from '@/lib/utils';

export const ProfitCalculator = () => {
  const [selectedCropId, setSelectedCropId] = useState(crops[0].id);
  const [quantity, setQuantity] = useState('100');
  const [costPerQuintal, setCostPerQuintal] = useState('');
  const [showResults, setShowResults] = useState(false);

  const selectedCrop = crops.find(c => c.id === selectedCropId)!;

  const calculations = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(costPerQuintal) || selectedCrop.currentPrice * 0.7;
    
    const currentRevenue = qty * selectedCrop.currentPrice;
    const predictedRevenue = qty * selectedCrop.predictedPrice;
    const totalCost = qty * cost;
    
    const currentProfit = currentRevenue - totalCost;
    const predictedProfit = predictedRevenue - totalCost;
    const profitDifference = predictedProfit - currentProfit;

    return {
      quantity: qty,
      costPerQuintal: cost,
      currentRevenue,
      predictedRevenue,
      totalCost,
      currentProfit,
      predictedProfit,
      profitDifference,
      profitMargin: ((currentProfit / currentRevenue) * 100).toFixed(1),
      predictedMargin: ((predictedProfit / predictedRevenue) * 100).toFixed(1),
    };
  }, [selectedCrop, quantity, costPerQuintal]);

  const handleCalculate = () => {
    setShowResults(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Profit Calculator</h2>
          <p className="text-muted-foreground">Estimate your potential earnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="card-elevated p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="crop">Select Crop</Label>
            <Select value={selectedCropId} onValueChange={setSelectedCropId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a crop" />
              </SelectTrigger>
              <SelectContent>
                {crops.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    <span className="flex items-center gap-2">
                      <span>{crop.icon}</span>
                      <span>{crop.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (Quintals)</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Production Cost (₹/Quintal)</Label>
            <Input
              id="cost"
              type="number"
              value={costPerQuintal}
              onChange={(e) => setCostPerQuintal(e.target.value)}
              placeholder={`Default: ₹${Math.round(selectedCrop.currentPrice * 0.7)}`}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use estimated average cost
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Market Price:</span>
              <span className="font-medium">₹{selectedCrop.currentPrice.toLocaleString()}/qtl</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Predicted Price:</span>
              <span className="font-medium text-primary">₹{selectedCrop.predictedPrice.toLocaleString()}/qtl</span>
            </div>
          </div>

          <Button onClick={handleCalculate} className="w-full btn-gold">
            Calculate Profit
          </Button>
        </div>

        {/* Results */}
        {showResults && (
          <div className="card-elevated p-6 space-y-6 animate-fade-in">
            <h3 className="font-semibold text-foreground">Profit Analysis</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Revenue (Current)</p>
                <p className="text-xl font-bold text-foreground">
                  ₹{calculations.currentRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary mb-1">Total Revenue (Predicted)</p>
                <p className="text-xl font-bold text-primary">
                  ₹{calculations.predictedRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Total Production Cost</p>
              <p className="text-lg font-semibold text-foreground">
                ₹{calculations.totalCost.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Current Profit</p>
                  <p className={cn(
                    "text-xl font-bold",
                    calculations.currentProfit >= 0 ? "text-success" : "text-destructive"
                  )}>
                    ₹{calculations.currentProfit.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Margin</p>
                  <p className="font-medium">{calculations.profitMargin}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                <div>
                  <p className="text-sm text-success">Predicted Profit</p>
                  <p className={cn(
                    "text-xl font-bold",
                    calculations.predictedProfit >= 0 ? "text-success" : "text-destructive"
                  )}>
                    ₹{calculations.predictedProfit.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Margin</p>
                  <p className="font-medium">{calculations.predictedMargin}%</p>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3",
              calculations.profitDifference >= 0 
                ? "bg-success/10 border border-success/20" 
                : "bg-warning/10 border border-warning/20"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                calculations.profitDifference >= 0 ? "text-success" : "text-warning"
              )} />
              <div>
                <p className="font-medium text-foreground">
                  {calculations.profitDifference >= 0 ? 'Potential Gain' : 'Potential Loss'} by Waiting
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  calculations.profitDifference >= 0 ? "text-success" : "text-warning"
                )}>
                  {calculations.profitDifference >= 0 ? '+' : ''}₹{calculations.profitDifference.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
