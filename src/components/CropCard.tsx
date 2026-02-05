import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Crop } from '@/types/crop';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CropCardProps {
  crop: Crop;
  onClick: () => void;
  isSelected?: boolean;
}

export const CropCard = ({ crop, onClick, isSelected }: CropCardProps) => {
  const priceChange = ((crop.currentPrice - crop.previousPrice) / crop.previousPrice) * 100;
  const isPositive = priceChange >= 0;

  const TrendIcon = crop.trend === 'up' 
    ? TrendingUp 
    : crop.trend === 'down' 
    ? TrendingDown 
    : Minus;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left card-glow p-5 transition-all duration-300",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{crop.icon}</span>
          <div>
            <h3 className="font-semibold text-foreground">{crop.name}</h3>
            <p className="text-sm text-muted-foreground">{crop.category}</p>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={cn(
            "font-medium",
            crop.trend === 'up' && "bg-success/10 text-success border-success/20",
            crop.trend === 'down' && "bg-destructive/10 text-destructive border-destructive/20",
            crop.trend === 'stable' && "bg-muted text-muted-foreground"
          )}
        >
          <TrendIcon className="h-3 w-3 mr-1" />
          {crop.trend}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-2xl font-bold text-foreground">
              ₹{crop.currentPrice.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{crop.unit}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Change</p>
            <p className={cn(
              "text-lg font-semibold",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Predicted Price</p>
            <p className="text-lg font-semibold text-primary">
              ₹{crop.predictedPrice.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-sm font-medium text-foreground">{crop.confidence}%</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </button>
  );
};
