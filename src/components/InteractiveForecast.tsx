import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Crop, PriceHistory } from '@/types/crop';
import { predictCropPrices, MLPredictionResult, clearModelCache } from '@/lib/mlPrediction';
import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw, Loader2, Sparkles, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportForecastToCSV, exportChartToPDF } from '@/lib/exportUtils';

interface InteractiveForecastProps {
  crop: Crop;
  priceHistory: PriceHistory[];
}

export const InteractiveForecast = ({ crop, priceHistory }: InteractiveForecastProps) => {
  const [seasonalWeight, setSeasonalWeight] = useState(50);
  const [trendWeight, setTrendWeight] = useState(50);
  const [forecastDays, setForecastDays] = useState(14);
  const [prediction, setPrediction] = useState<MLPredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runPrediction = useCallback(async () => {
    if (priceHistory.length === 0) {
      toast.error('No price history available for prediction');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await predictCropPrices(
        priceHistory,
        crop,
        forecastDays,
        seasonalWeight / 100,
        trendWeight / 100
      );
      setPrediction(result);
      setHasRun(true);
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Failed to generate prediction');
    } finally {
      setIsLoading(false);
    }
  }, [crop, priceHistory, forecastDays, seasonalWeight, trendWeight]);

  const handleRetrain = async () => {
    clearModelCache();
    toast.success('Model cache cleared');
    await runPrediction();
  };

  // Run prediction when crop, history, or current price changes
  useEffect(() => {
    if (priceHistory.length > 0) {
      setHasRun(false);
      runPrediction();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop.id, crop.currentPrice, priceHistory.length]);

  const TrendIcon = prediction?.trend === 'up' ? TrendingUp : 
                    prediction?.trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="card-elevated p-6 space-y-6" id="interactive-forecast">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              TensorFlow.js ML Forecast
            </h3>
            <p className="text-sm text-muted-foreground">
              Adjust parameters for real-time prediction updates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prediction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  exportForecastToCSV(
                    crop.name,
                    prediction.predictions,
                    prediction.upperBand,
                    prediction.lowerBand,
                    prediction.confidence,
                    prediction.trend
                  );
                  toast.success('Forecast exported to CSV');
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Forecast (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await exportChartToPDF('interactive-forecast', `${crop.name} ML Forecast`, {
                    'Forecast Days': forecastDays,
                    'Confidence': `${prediction.confidence}%`,
                    'Trend': prediction.trend.toUpperCase(),
                  });
                  toast.success('Forecast exported to PDF');
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Report (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Neural Network
          </Badge>
        </div>
      </div>

      {/* Parameter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Seasonal Weight</Label>
            <span className="text-sm text-primary font-bold">{seasonalWeight}%</span>
          </div>
          <Slider
            value={[seasonalWeight]}
            onValueChange={(v) => setSeasonalWeight(v[0])}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Weight of seasonal patterns in prediction
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Trend Momentum</Label>
            <span className="text-sm text-primary font-bold">{trendWeight}%</span>
          </div>
          <Slider
            value={[trendWeight]}
            onValueChange={(v) => setTrendWeight(v[0])}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Weight of historical trend direction
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Forecast Days</Label>
            <span className="text-sm text-primary font-bold">{forecastDays} days</span>
          </div>
          <Slider
            value={[forecastDays]}
            onValueChange={(v) => setForecastDays(v[0])}
            min={7}
            max={30}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Number of days to forecast
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={runPrediction} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          Generate Forecast
        </Button>
        <Button 
          variant="outline" 
          onClick={handleRetrain}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retrain Model
        </Button>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-xl font-bold text-foreground">
                ₹{crop.currentPrice.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-primary mb-1">Predicted (Avg)</p>
              <p className="text-xl font-bold text-primary">
                ₹{Math.round(
                  prediction.predictions.reduce((a, b) => a + b, 0) / prediction.predictions.length
                ).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Trend</p>
              <div className={cn(
                "flex items-center gap-2 text-lg font-bold",
                prediction.trend === 'up' && "text-success",
                prediction.trend === 'down' && "text-destructive",
                prediction.trend === 'stable' && "text-muted-foreground"
              )}>
                <TrendIcon className="h-5 w-5" />
                {prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Volatility</p>
              <p className="text-xl font-bold text-foreground">
                {prediction.volatility.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Confidence Meter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Model Confidence</span>
              <span className="text-lg font-bold text-primary">{prediction.confidence}%</span>
            </div>
            <Progress value={prediction.confidence} className="h-2" />
          </div>

          {/* Price Range Forecast */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {forecastDays}-Day Forecast Range
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Lower Band</p>
                <p className="font-bold text-destructive">
                  ₹{prediction.lowerBand[prediction.lowerBand.length - 1]?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Expected</p>
                <p className="font-bold text-primary">
                  ₹{prediction.predictions[prediction.predictions.length - 1]?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Upper Band</p>
                <p className="font-bold text-success">
                  ₹{prediction.upperBand[prediction.upperBand.length - 1]?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Factors */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Analysis Factors</h4>
            <div className="flex flex-wrap gap-2">
              {prediction.factors.map((factor, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
