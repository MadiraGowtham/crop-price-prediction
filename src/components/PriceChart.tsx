import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import { PriceHistory } from '@/types/crop';

interface PriceChartProps {
  data: PriceHistory[];
  cropName: string;
}

export const PriceChart = ({ data, cropName }: PriceChartProps) => {
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">
                ₹{entry.value?.toLocaleString() || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-elevated p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Price Trend - {cropName}
        </h3>
        <p className="text-sm text-muted-foreground">
          30-day history with 14-day prediction
        </p>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(145, 45%, 28%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(145, 45%, 28%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(145, 20%, 88%)" 
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
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
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(145, 45%, 28%)"
              fill="url(#priceGradient)"
              strokeWidth={2}
              name="Actual Price"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(42, 85%, 55%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Predicted Price"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
