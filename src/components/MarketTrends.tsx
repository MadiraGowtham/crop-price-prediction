import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { crops, marketData } from '@/data/cropData';
import { Badge } from '@/components/ui/badge';

const COLORS = [
  'hsl(145, 45%, 28%)',
  'hsl(42, 85%, 55%)',
  'hsl(200, 70%, 55%)',
  'hsl(30, 35%, 35%)',
  'hsl(0, 72%, 51%)',
];

export const MarketTrends = () => {
  const trendData = useMemo(() => {
    const upCount = crops.filter(c => c.trend === 'up').length;
    const downCount = crops.filter(c => c.trend === 'down').length;
    const stableCount = crops.filter(c => c.trend === 'stable').length;

    return [
      { name: 'Rising', value: upCount, color: 'hsl(142, 70%, 45%)' },
      { name: 'Falling', value: downCount, color: 'hsl(0, 72%, 51%)' },
      { name: 'Stable', value: stableCount, color: 'hsl(145, 15%, 45%)' },
    ];
  }, []);

  const categoryData = useMemo(() => {
    const categories: Record<string, { total: number; count: number }> = {};
    
    crops.forEach(crop => {
      if (!categories[crop.category]) {
        categories[crop.category] = { total: 0, count: 0 };
      }
      categories[crop.category].total += crop.currentPrice;
      categories[crop.category].count += 1;
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      avgPrice: Math.round(data.total / data.count),
    }));
  }, []);

  const volumeData = marketData.slice(0, 6).map(item => ({
    name: item.crop,
    volume: item.volume,
    change: item.change,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Market Trends</h2>
          <p className="text-muted-foreground">Comprehensive market analysis and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Price Trend Distribution</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trendData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(0, 0%, 100%)', 
                    border: '1px solid hsl(145, 20%, 88%)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {trendData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                {item.name === 'Rising' && <TrendingUp className="h-4 w-4 text-success" />}
                {item.name === 'Falling' && <TrendingDown className="h-4 w-4 text-destructive" />}
                {item.name === 'Stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Average Prices */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Average Price by Category</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 20%, 88%)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'hsl(145, 15%, 45%)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(145, 20%, 88%)' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(145, 15%, 45%)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(0, 0%, 100%)', 
                    border: '1px solid hsl(145, 20%, 88%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`₹${value}`, 'Avg Price']}
                />
                <Bar 
                  dataKey="avgPrice" 
                  fill="hsl(145, 45%, 28%)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trading Volume */}
        <div className="card-elevated p-6 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Trading Volume by Crop</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(145, 20%, 88%)" horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12, fill: 'hsl(145, 15%, 45%)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(145, 20%, 88%)' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(145, 15%, 45%)' }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(0, 0%, 100%)', 
                    border: '1px solid hsl(145, 20%, 88%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()} tons`, 'Volume']}
                />
                <Bar 
                  dataKey="volume" 
                  fill="hsl(42, 85%, 55%)" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Movers */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Top Market Movers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {crops
            .map(crop => ({
              ...crop,
              change: ((crop.currentPrice - crop.previousPrice) / crop.previousPrice) * 100
            }))
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, 4)
            .map((crop) => (
              <div key={crop.id} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{crop.icon}</span>
                  <span className="font-medium">{crop.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">₹{crop.currentPrice.toLocaleString()}</span>
                  <Badge 
                    variant="secondary"
                    className={crop.change >= 0 
                      ? "bg-success/10 text-success border-success/20" 
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    {crop.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {crop.change >= 0 ? '+' : ''}{crop.change.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
