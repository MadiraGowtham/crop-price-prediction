import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Crop } from '@/types/crop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrendingUp, TrendingDown, Minus, BarChart3, X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportComparisonToCSV, exportChartToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface CropComparisonProps {
  crops: Crop[];
  priceHistories: Map<string, number[]>;
}

const CHART_COLORS = [
  'hsl(145, 45%, 35%)',
  'hsl(42, 85%, 55%)',
  'hsl(200, 80%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(350, 70%, 55%)',
  'hsl(170, 60%, 45%)',
];

export const CropComparison = ({ crops, priceHistories }: CropComparisonProps) => {
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>([]);
  const [normalizeData, setNormalizeData] = useState(true);

  const selectedCrops = useMemo(() => 
    crops.filter(c => selectedCropIds.includes(c.id)),
    [crops, selectedCropIds]
  );

  const toggleCrop = (cropId: string) => {
    setSelectedCropIds(prev => 
      prev.includes(cropId) 
        ? prev.filter(id => id !== cropId)
        : prev.length < 6 
          ? [...prev, cropId]
          : prev
    );
  };

  const removeCrop = (cropId: string) => {
    setSelectedCropIds(prev => prev.filter(id => id !== cropId));
  };

  const clearAll = () => setSelectedCropIds([]);

  // Build synchronized chart data
  const chartData = useMemo(() => {
    if (selectedCrops.length === 0) return [];

    const days = 30;
    const data: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const point: any = { date: dateStr, day: i };

      selectedCrops.forEach((crop, idx) => {
        const history = priceHistories.get(crop.id) || [];
        const price = history[i] || crop.currentPrice;
        
        if (normalizeData && history.length > 0) {
          // Normalize to percentage change from first day
          const basePrice = history[0] || price;
          point[crop.id] = ((price - basePrice) / basePrice) * 100;
        } else {
          point[crop.id] = price;
        }
      });

      data.push(point);
    }

    return data;
  }, [selectedCrops, priceHistories, normalizeData]);

  // Calculate comparison metrics
  const metrics = useMemo(() => {
    return selectedCrops.map(crop => {
      const history = priceHistories.get(crop.id) || [];
      const prices = history.length > 0 ? history : [crop.currentPrice];
      
      const currentPrice = crop.currentPrice;
      const previousPrice = crop.previousPrice;
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = (priceChange / previousPrice) * 100;
      
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const volatility = Math.sqrt(
        prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length
      ) / avg * 100;

      return {
        crop,
        currentPrice,
        priceChange,
        priceChangePercent,
        high,
        low,
        avg: Math.round(avg),
        volatility: volatility.toFixed(1),
        predictedPrice: crop.predictedPrice,
        predictedChange: ((crop.predictedPrice - currentPrice) / currentPrice) * 100,
        confidence: crop.confidence,
        trend: crop.trend,
      };
    });
  }, [selectedCrops, priceHistories]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2 border-b border-border pb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const crop = selectedCrops.find(c => c.id === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{crop?.name}</span>
                </div>
                <span className="font-semibold text-foreground">
                  {normalizeData 
                    ? `${entry.value >= 0 ? '+' : ''}${entry.value.toFixed(1)}%`
                    : `₹${entry.value.toLocaleString()}`
                  }
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="card-elevated" id="crop-comparison">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Crop Comparison</CardTitle>
            <Badge variant="secondary">{selectedCrops.length}/6 selected</Badge>
          </div>
          <div className="flex items-center gap-3">
            {metrics.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    exportComparisonToCSV(metrics);
                    toast.success('Comparison data exported to CSV');
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Data (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    await exportChartToPDF('crop-comparison', 'Crop Comparison Analysis', {
                      'Crops Compared': selectedCrops.map(c => c.name).join(', '),
                    });
                    toast.success('Comparison exported to PDF');
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export Chart (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="normalize" 
                checked={normalizeData}
                onCheckedChange={(checked) => setNormalizeData(checked as boolean)}
              />
              <label htmlFor="normalize" className="text-sm cursor-pointer">
                Normalize (% change)
              </label>
            </div>
            {selectedCrops.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crop Selection */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select up to 6 crops to compare:</p>
          <ScrollArea className="h-24">
            <div className="flex flex-wrap gap-2">
              {crops.map((crop, idx) => (
                <Button
                  key={crop.id}
                  variant={selectedCropIds.includes(crop.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCrop(crop.id)}
                  disabled={!selectedCropIds.includes(crop.id) && selectedCropIds.length >= 6}
                  className="gap-2"
                  style={selectedCropIds.includes(crop.id) ? {
                    backgroundColor: CHART_COLORS[selectedCropIds.indexOf(crop.id) % CHART_COLORS.length],
                  } : {}}
                >
                  <span>{crop.icon}</span>
                  {crop.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Selected Crops Tags */}
        {selectedCrops.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCrops.map((crop, idx) => (
              <Badge 
                key={crop.id} 
                variant="secondary"
                className="gap-1 pr-1"
                style={{ 
                  borderColor: CHART_COLORS[idx % CHART_COLORS.length],
                  borderWidth: 2 
                }}
              >
                {crop.icon} {crop.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => removeCrop(crop.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Synchronized Chart */}
        {selectedCrops.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => normalizeData ? `${value}%` : `₹${value}`}
                  domain={normalizeData ? ['auto', 'auto'] : ['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => {
                    const crop = selectedCrops.find(c => c.id === value);
                    return <span className="text-sm">{crop?.icon} {crop?.name}</span>;
                  }}
                />
                {normalizeData && (
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                )}
                {selectedCrops.map((crop, idx) => (
                  <Line
                    key={crop.id}
                    type="monotone"
                    dataKey={crop.id}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center bg-muted/30 rounded-xl">
            <p className="text-muted-foreground">Select crops above to compare their price trends</p>
          </div>
        )}

        {/* Comparison Metrics Table */}
        {metrics.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Crop</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Current</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Change</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">High</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Low</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Avg</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Volatility</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Predicted</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, idx) => (
                  <tr key={m.crop.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span>{m.crop.icon}</span>
                        <span className="font-medium">{m.crop.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-semibold">
                      ₹{m.currentPrice.toLocaleString()}
                    </td>
                    <td className={cn(
                      "text-right py-3 px-2 font-medium",
                      m.priceChangePercent >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {m.priceChangePercent >= 0 ? '+' : ''}{m.priceChangePercent.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-2 text-success">
                      ₹{m.high.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2 text-destructive">
                      ₹{m.low.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      ₹{m.avg.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      {m.volatility}%
                    </td>
                    <td className={cn(
                      "text-right py-3 px-2 font-medium",
                      m.predictedChange >= 0 ? "text-success" : "text-destructive"
                    )}>
                      ₹{m.predictedPrice.toLocaleString()}
                      <span className="text-xs ml-1">
                        ({m.predictedChange >= 0 ? '+' : ''}{m.predictedChange.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex justify-center">
                        <TrendIcon trend={m.trend} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Insights */}
        {metrics.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Best Performer</p>
              <p className="font-bold text-success">
                {metrics.reduce((best, m) => 
                  m.priceChangePercent > best.priceChangePercent ? m : best
                ).crop.name}
              </p>
              <p className="text-sm text-muted-foreground">
                +{Math.max(...metrics.map(m => m.priceChangePercent)).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Most Volatile</p>
              <p className="font-bold text-accent-foreground">
                {metrics.reduce((most, m) => 
                  parseFloat(m.volatility) > parseFloat(most.volatility) ? m : most
                ).crop.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.max(...metrics.map(m => parseFloat(m.volatility))).toFixed(1)}% volatility
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Highest Predicted Gain</p>
              <p className="font-bold text-primary">
                {metrics.reduce((best, m) => 
                  m.predictedChange > best.predictedChange ? m : best
                ).crop.name}
              </p>
              <p className="text-sm text-muted-foreground">
                +{Math.max(...metrics.map(m => m.predictedChange)).toFixed(1)}% expected
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
