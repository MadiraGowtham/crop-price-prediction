import { useState } from 'react';
import { Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { crops, categories } from '@/data/cropData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export const CropDatabase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredCrops = crops.filter((crop) => {
    const matchesSearch = crop.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || crop.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Filter className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Crop Database</h2>
          <p className="text-muted-foreground">Complete list of tracked crops and prices</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search crops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Crop Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Crop</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold text-right">Current Price</TableHead>
                <TableHead className="font-semibold text-right">Predicted</TableHead>
                <TableHead className="font-semibold text-center">Trend</TableHead>
                <TableHead className="font-semibold text-center">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCrops.map((crop) => {
                const priceChange = ((crop.currentPrice - crop.previousPrice) / crop.previousPrice) * 100;
                
                return (
                  <TableRow key={crop.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{crop.icon}</span>
                        <span className="font-medium">{crop.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{crop.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-semibold">₹{crop.currentPrice.toLocaleString()}</p>
                        <p className={cn(
                          "text-xs flex items-center justify-end gap-1",
                          priceChange >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {priceChange >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-primary">
                        ₹{crop.predictedPrice.toLocaleString()}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="secondary"
                        className={cn(
                          crop.trend === 'up' && "bg-success/10 text-success border-success/20",
                          crop.trend === 'down' && "bg-destructive/10 text-destructive border-destructive/20",
                          crop.trend === 'stable' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {crop.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {crop.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                        {crop.trend}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${crop.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{crop.confidence}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
