import { MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import { marketData } from '@/data/cropData';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const regions = [
  { name: 'Punjab', crops: ['Wheat', 'Rice', 'Cotton'], status: 'active' },
  { name: 'Maharashtra', crops: ['Sugarcane', 'Onion', 'Soybean'], status: 'active' },
  { name: 'Gujarat', crops: ['Cotton', 'Groundnut', 'Wheat'], status: 'active' },
  { name: 'Uttar Pradesh', crops: ['Wheat', 'Rice', 'Potato', 'Sugarcane'], status: 'active' },
  { name: 'West Bengal', crops: ['Rice', 'Potato', 'Jute'], status: 'active' },
  { name: 'Madhya Pradesh', crops: ['Soybean', 'Wheat', 'Maize'], status: 'active' },
  { name: 'Karnataka', crops: ['Maize', 'Rice', 'Sugarcane'], status: 'active' },
  { name: 'Andhra Pradesh', crops: ['Rice', 'Cotton', 'Groundnut'], status: 'active' },
];

export const RegionalData = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Regional Data</h2>
          <p className="text-muted-foreground">Market prices by region and state</p>
        </div>
      </div>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((region) => {
          const regionMarketData = marketData.filter(m => m.region === region.name);
          
          return (
            <div key={region.name} className="card-glow p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{region.name}</h3>
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Major Crops
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {region.crops.map((crop) => (
                      <Badge key={crop} variant="outline" className="text-xs">
                        {crop}
                      </Badge>
                    ))}
                  </div>
                </div>

                {regionMarketData.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Latest Prices
                    </p>
                    {regionMarketData.slice(0, 2).map((data) => (
                      <div 
                        key={data.crop} 
                        className="flex items-center justify-between py-2"
                      >
                        <span className="text-sm text-foreground">{data.crop}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            ₹{data.price.toLocaleString()}
                          </span>
                          <span className={cn(
                            "flex items-center text-xs font-medium",
                            data.change >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {data.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-0.5" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-0.5" />
                            )}
                            {data.change >= 0 ? '+' : ''}{data.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Regional Market Summary */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Regional Market Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-3xl font-bold text-foreground">{regions.length}</p>
            <p className="text-sm text-muted-foreground">Active Regions</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-3xl font-bold text-primary">{marketData.length}</p>
            <p className="text-sm text-muted-foreground">Market Feeds</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 text-center">
            <p className="text-3xl font-bold text-success">
              {marketData.filter(m => m.change >= 0).length}
            </p>
            <p className="text-sm text-muted-foreground">Rising Markets</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 text-center">
            <p className="text-3xl font-bold text-destructive">
              {marketData.filter(m => m.change < 0).length}
            </p>
            <p className="text-sm text-muted-foreground">Declining Markets</p>
          </div>
        </div>
      </div>
    </div>
  );
};
