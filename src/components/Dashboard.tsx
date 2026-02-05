import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, BarChart3, Target, Wheat, RefreshCw, Loader2, Brain, Activity, GitCompare, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { StatCard } from './StatCard';
import { CropCard } from './CropCard';
import { EnhancedPriceChart } from './EnhancedPriceChart';
import { PredictionPanel } from './PredictionPanel';
import { MarketTable } from './MarketTable';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { InteractiveForecast } from './InteractiveForecast';
import { CropComparison } from './CropComparison';
import { useCrops, usePriceHistory, useGeneratePredictions, useCropRealtimeUpdates, categories } from '@/hooks/useCropData';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Crop } from '@/types/crop';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { exportCropsToCSV, exportFullReportPDF } from '@/lib/exportUtils';

export const Dashboard = () => {
  const { data: crops = [], isLoading, error } = useCrops();
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [priceHistoriesMap, setPriceHistoriesMap] = useState<Map<string, number[]>>(new Map());
  
  const generatePredictions = useGeneratePredictions();
  useCropRealtimeUpdates();

  // Set initial selected crop when data loads
  useEffect(() => {
    if (crops.length > 0 && !selectedCrop) {
      setSelectedCrop(crops[0]);
    }
  }, [crops, selectedCrop]);

  // Update selected crop when crops data changes
  useEffect(() => {
    if (selectedCrop && crops.length > 0) {
      const updatedCrop = crops.find(c => c.id === selectedCrop.id);
      if (updatedCrop) {
        setSelectedCrop(updatedCrop);
      }
    }
  }, [crops, selectedCrop?.id]);

  const { data: priceHistory = [] } = usePriceHistory(selectedCrop?.id || '');

  // Build price histories map for correlation analysis
  useEffect(() => {
    const fetchAllHistories = async () => {
      const newMap = new Map<string, number[]>();
      crops.forEach(crop => {
        // Use currentPrice and simulate some history for correlation
        const basePrice = crop.currentPrice;
        const simulated = Array.from({ length: 30 }, (_, i) => 
          Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.1 - i * 0.002))
        ).reverse();
        newMap.set(crop.id, simulated);
      });
      setPriceHistoriesMap(newMap);
    };

    if (crops.length > 0) {
      fetchAllHistories();
    }
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (activeCategory === 'All') return crops;
    return crops.filter(crop => crop.category === activeCategory);
  }, [activeCategory, crops]);

  const stats = useMemo(() => {
    if (crops.length === 0) {
      return { avgPrice: 0, avgConfidence: 0, upTrends: 0, totalCrops: 0 };
    }
    const avgPrice = crops.reduce((acc, c) => acc + c.currentPrice, 0) / crops.length;
    const avgConfidence = crops.reduce((acc, c) => acc + c.confidence, 0) / crops.length;
    const upTrends = crops.filter(c => c.trend === 'up').length;
    
    return {
      avgPrice: Math.round(avgPrice),
      avgConfidence: Math.round(avgConfidence),
      upTrends,
      totalCrops: crops.length,
    };
  }, [crops]);

  const handleRefreshPredictions = async () => {
    try {
      await generatePredictions.mutateAsync();
      toast.success('Predictions updated successfully!');
    } catch (err) {
      toast.error('Failed to refresh predictions');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive">Error loading crop data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with ML Badge and Refresh Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground">Market Dashboard</h1>
          <Badge variant="secondary" className="gap-1">
            <Brain className="h-3 w-3" />
            TensorFlow.js Powered
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                exportCropsToCSV(crops);
                toast.success('Crop data exported to CSV');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export All Crops (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await exportFullReportPDF(crops, selectedCrop || undefined);
                toast.success('Market report exported to PDF');
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Download Full Report (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleRefreshPredictions}
            disabled={generatePredictions.isPending}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {generatePredictions.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Average Price Index"
              value={`₹${stats.avgPrice.toLocaleString()}`}
              change={3.2}
              icon={BarChart3}
              variant="primary"
            />
            <StatCard
              title="ML Prediction Accuracy"
              value={`${stats.avgConfidence}%`}
              change={1.5}
              icon={Target}
            />
            <StatCard
              title="Rising Trends"
              value={`${stats.upTrends}/${stats.totalCrops}`}
              icon={TrendingUp}
              variant="accent"
            />
            <StatCard
              title="Crops Tracked"
              value={stats.totalCrops}
              icon={Wheat}
            />
          </>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className={cn(
              activeCategory === category && "shadow-md"
            )}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crop Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-display font-bold text-foreground">Select Crop</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </>
            ) : filteredCrops.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No crop data available.</p>
                <Button onClick={handleRefreshPredictions} className="mt-4" size="sm">
                  Generate Predictions
                </Button>
              </div>
            ) : (
              filteredCrops.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  onClick={() => setSelectedCrop(crop)}
                  isSelected={selectedCrop?.id === crop.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Chart and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCrop ? (
            <Tabs defaultValue="analysis" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Price Analysis
                </TabsTrigger>
                <TabsTrigger value="forecast" className="gap-2">
                  <Brain className="h-4 w-4" />
                  ML Forecast
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <Target className="h-4 w-4" />
                  Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6">
                <EnhancedPriceChart 
                  data={priceHistory} 
                  cropName={selectedCrop.name}
                />
              </TabsContent>

              <TabsContent value="forecast" className="space-y-6">
                <InteractiveForecast 
                  crop={selectedCrop} 
                  priceHistory={priceHistory}
                />
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <PredictionPanel crop={selectedCrop} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-96 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">Select a crop to view predictions</p>
            </div>
          )}
        </div>
      </div>

      {/* Crop Comparison */}
      <CropComparison crops={crops} priceHistories={priceHistoriesMap} />

      {/* Correlation Heatmap */}
      <CorrelationHeatmap crops={crops} priceHistories={priceHistoriesMap} />

      {/* Market Table */}
      <MarketTable />
    </div>
  );
};
