import { useMemo, useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  ReferenceLine,
  Brush,
} from 'recharts';
import { PriceHistory } from '@/types/crop';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrendingUp, TrendingDown, Activity, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportPriceHistoryToCSV, exportChartToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface EnhancedPriceChartProps {
  data: PriceHistory[];
  cropName: string;
  confidenceBands?: {
    upper: number[];
    lower: number[];
  };
  movingAverage?: number[];
}

export const EnhancedPriceChart = ({ 
  data, 
  cropName,
  confidenceBands,
  movingAverage 
}: EnhancedPriceChartProps) => {
  const [showMA, setShowMA] = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [showVolume, setShowVolume] = useState(false);

  const formattedData = useMemo(() => {
    const prices = data.filter(d => d.price != null).map(d => d.price);
    const avgPrice = prices.length > 0 
      ? prices.reduce((a, b) => a + b, 0) / prices.length 
      : 0;

    return data.map((item, index) => {
      // Calculate 7-day moving average
      const windowStart = Math.max(0, index - 6);
      const window = data.slice(windowStart, index + 1)
        .filter(d => d.price != null)
        .map(d => d.price);
      const ma7 = window.length > 0 
        ? Math.round(window.reduce((a, b) => a + b, 0) / window.length)
        : null;

      // Calculate RSI-like momentum indicator (simplified)
      let momentum = 50;
      if (index > 0 && data[index - 1]?.price != null && item.price != null) {
        const change = ((item.price - data[index - 1].price) / data[index - 1].price) * 100;
        momentum = Math.min(100, Math.max(0, 50 + change * 10));
      }

      // Get confidence bands if available
      const predictedIndex = data.filter(d => d.price != null).length - 1;
      const futureIndex = index - predictedIndex - 1;
      const upperBand = futureIndex >= 0 && confidenceBands?.upper[futureIndex];
      const lowerBand = futureIndex >= 0 && confidenceBands?.lower[futureIndex];

      return {
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        ma7,
        momentum,
        avgPrice,
        upperBand: upperBand || null,
        lowerBand: lowerBand || null,
      };
    });
  }, [data, confidenceBands]);

  // Calculate trend statistics
  const stats = useMemo(() => {
    const prices = data.filter(d => d.price != null).map(d => d.price);
    if (prices.length < 2) return { change: 0, changePercent: 0, trend: 'stable' };

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    return { change, changePercent, trend };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg min-w-[200px]">
          <p className="font-semibold text-foreground mb-3 border-b border-border pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value != null && (
              <div key={index} className="flex items-center justify-between gap-4 text-sm py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-semibold text-foreground">
                  ₹{entry.value?.toLocaleString()}
                </span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-elevated p-6" id="enhanced-price-chart">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Advanced Price Analysis - {cropName}
            </h3>
            <Badge 
              variant={stats.trend === 'up' ? 'default' : stats.trend === 'down' ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {stats.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
               stats.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
               <Activity className="h-3 w-3" />}
              {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            30-day history with trend indicators and confidence bands
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                exportPriceHistoryToCSV(data, cropName);
                toast.success('Price history exported to CSV');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Data (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await exportChartToPDF('enhanced-price-chart', `${cropName} Price Analysis`, {
                  'Period High': `₹${Math.max(...data.filter(d => d.price != null).map(d => d.price))}`,
                  'Period Low': `₹${Math.min(...data.filter(d => d.price != null).map(d => d.price))}`,
                  'Change': `${stats.changePercent.toFixed(1)}%`,
                });
                toast.success('Chart exported to PDF');
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Export Chart (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-ma" 
              checked={showMA} 
              onCheckedChange={setShowMA}
            />
            <Label htmlFor="show-ma" className="text-sm cursor-pointer">
              Moving Avg
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-bands" 
              checked={showBands} 
              onCheckedChange={setShowBands}
            />
            <Label htmlFor="show-bands" className="text-sm cursor-pointer">
              Confidence Bands
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-volume" 
              checked={showVolume} 
              onCheckedChange={setShowVolume}
            />
            <Label htmlFor="show-volume" className="text-sm cursor-pointer">
              Momentum
            </Label>
          </div>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData}>
            <defs>
              <linearGradient id="priceGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(145, 45%, 28%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(145, 45%, 28%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="predictedGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(145, 20%, 88%)" 
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: 'hsl(145, 15%, 45%)' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(145, 20%, 88%)' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(145, 15%, 45%)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />

            {/* Average price reference line */}
            <ReferenceLine 
              y={formattedData[0]?.avgPrice} 
              stroke="hsl(145, 15%, 45%)" 
              strokeDasharray="8 8"
              strokeOpacity={0.5}
              label={{ 
                value: 'Avg', 
                position: 'right',
                fill: 'hsl(145, 15%, 45%)',
                fontSize: 10
              }}
            />

            {/* Confidence bands */}
            {showBands && (
              <>
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  stroke="hsl(200, 80%, 50%)"
                  fill="url(#bandGradient)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Upper Band"
                  connectNulls
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBand"
                  stroke="hsl(200, 80%, 50%)"
                  fill="transparent"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Lower Band"
                  connectNulls
                  dot={false}
                />
              </>
            )}

            {/* Actual price area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(145, 45%, 28%)"
              fill="url(#priceGradientEnhanced)"
              strokeWidth={2.5}
              name="Actual Price"
              connectNulls
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />

            {/* Moving average */}
            {showMA && (
              <Line
                type="monotone"
                dataKey="ma7"
                stroke="hsl(280, 60%, 55%)"
                strokeWidth={2}
                dot={false}
                name="7-Day MA"
                connectNulls
              />
            )}

            {/* Predicted price */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(42, 85%, 55%)"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              name="ML Prediction"
              connectNulls
            />

            {/* Momentum indicator */}
            {showVolume && (
              <Line
                type="monotone"
                dataKey="momentum"
                stroke="hsl(0, 70%, 55%)"
                strokeWidth={1}
                dot={false}
                name="Momentum"
                yAxisId="right"
                connectNulls
              />
            )}

            <Brush 
              dataKey="date" 
              height={30} 
              stroke="hsl(145, 45%, 28%)"
              fill="hsl(145, 20%, 95%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Period High</p>
          <p className="text-lg font-bold text-success">
            ₹{Math.max(...data.filter(d => d.price != null).map(d => d.price)).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Period Low</p>
          <p className="text-lg font-bold text-destructive">
            ₹{Math.min(...data.filter(d => d.price != null).map(d => d.price)).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Price Change</p>
          <p className={`text-lg font-bold ${stats.change >= 0 ? 'text-success' : 'text-destructive'}`}>
            {stats.change >= 0 ? '+' : ''}₹{Math.abs(Math.round(stats.change)).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Volatility</p>
          <p className="text-lg font-bold text-foreground">
            {(() => {
              const prices = data.filter(d => d.price != null).map(d => d.price);
              const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
              const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
              return ((Math.sqrt(variance) / mean) * 100).toFixed(1);
            })()}%
          </p>
        </div>
      </div>
    </div>
  );
};
