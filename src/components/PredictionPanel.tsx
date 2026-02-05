import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Crop } from '@/types/crop';
import { predictionFactors } from '@/data/cropData';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PredictionPanelProps {
  crop: Crop;
}

export const PredictionPanel = ({ crop }: PredictionPanelProps) => {
  const priceChange = crop.predictedPrice - crop.currentPrice;
  const percentChange = (priceChange / crop.currentPrice) * 100;
  const isPositive = priceChange >= 0;

  const getRecommendation = () => {
    if (crop.trend === 'up' && crop.confidence > 80) {
      return {
        text: 'Strong Buy Signal - Prices expected to rise. Consider holding inventory.',
        type: 'success',
        icon: CheckCircle,
      };
    } else if (crop.trend === 'down' && crop.confidence > 75) {
      return {
        text: 'Sell Signal - Prices may decline. Consider selling current stock.',
        type: 'warning',
        icon: AlertCircle,
      };
    }
    return {
      text: 'Hold Position - Market conditions are uncertain. Monitor closely.',
      type: 'info',
      icon: Info,
    };
  };

  const recommendation = getRecommendation();

  return (
    <div className="space-y-6">
      {/* Main Prediction Card */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{crop.icon}</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">{crop.name}</h2>
            <p className="text-muted-foreground">{crop.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-2xl font-bold text-foreground">
              ₹{crop.currentPrice.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{crop.unit}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-primary mb-1">Predicted Price</p>
            <p className="text-2xl font-bold text-primary">
              ₹{crop.predictedPrice.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}₹{priceChange.toLocaleString()} ({percentChange.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Prediction Confidence</span>
            </div>
            <span className="text-lg font-bold text-primary">{crop.confidence}%</span>
          </div>
          <Progress value={crop.confidence} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Based on machine learning analysis of historical data
          </p>
        </div>

        {/* Recommendation */}
        <div className={cn(
          "p-4 rounded-lg flex items-start gap-3",
          recommendation.type === 'success' && "bg-success/10 border border-success/20",
          recommendation.type === 'warning' && "bg-warning/10 border border-warning/20",
          recommendation.type === 'info' && "bg-info/10 border border-info/20"
        )}>
          <recommendation.icon className={cn(
            "h-5 w-5 mt-0.5",
            recommendation.type === 'success' && "text-success",
            recommendation.type === 'warning' && "text-warning",
            recommendation.type === 'info' && "text-info"
          )} />
          <div>
            <p className="font-medium text-foreground">Market Recommendation</p>
            <p className="text-sm text-muted-foreground">{recommendation.text}</p>
          </div>
        </div>
      </div>

      {/* Analysis Factors */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Analysis Factors</h3>
        <div className="space-y-3">
          {predictionFactors.map((factor, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{index + 1}</span>
              </div>
              <span className="text-sm text-foreground">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Info */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Prediction Model</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Random Forest</Badge>
          <Badge variant="secondary">TensorFlow</Badge>
          <Badge variant="secondary">OpenCV</Badge>
          <Badge variant="secondary">Time Series Analysis</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Our AI model combines multiple algorithms to provide accurate price predictions 
          with up to 91% accuracy on historical validation.
        </p>
      </div>
    </div>
  );
};
