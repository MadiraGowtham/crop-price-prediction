import { useMemo } from 'react';
import { Crop } from '@/types/crop';
import { calculateCorrelation } from '@/lib/mlPrediction';
import { cn } from '@/lib/utils';
import { Info, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadCSV, exportChartToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface CorrelationHeatmapProps {
  crops: Crop[];
  priceHistories: Map<string, number[]>;
}

export const CorrelationHeatmap = ({ crops, priceHistories }: CorrelationHeatmapProps) => {
  const correlationMatrix = useMemo(() => {
    const matrix: { crop1: string; crop2: string; correlation: number }[] = [];
    
    crops.forEach((crop1, i) => {
      crops.forEach((crop2, j) => {
        const prices1 = priceHistories.get(crop1.id) || [];
        const prices2 = priceHistories.get(crop2.id) || [];
        
        const correlation = i === j ? 1 : calculateCorrelation(prices1, prices2);
        matrix.push({
          crop1: crop1.name,
          crop2: crop2.name,
          correlation: Math.round(correlation * 100) / 100
        });
      });
    });
    
    return matrix;
  }, [crops, priceHistories]);

  const getCorrelationColor = (value: number): string => {
    if (value >= 0.7) return 'bg-success/80 text-success-foreground';
    if (value >= 0.4) return 'bg-success/50 text-foreground';
    if (value >= 0.1) return 'bg-success/20 text-foreground';
    if (value >= -0.1) return 'bg-muted text-muted-foreground';
    if (value >= -0.4) return 'bg-warning/30 text-foreground';
    if (value >= -0.7) return 'bg-warning/60 text-foreground';
    return 'bg-destructive/70 text-destructive-foreground';
  };

  const getCorrelationLabel = (value: number): string => {
    if (value >= 0.7) return 'Strong positive';
    if (value >= 0.4) return 'Moderate positive';
    if (value >= 0.1) return 'Weak positive';
    if (value >= -0.1) return 'No correlation';
    if (value >= -0.4) return 'Weak negative';
    if (value >= -0.7) return 'Moderate negative';
    return 'Strong negative';
  };

  const exportCorrelationData = () => {
    const data: any[] = [];
    crops.forEach((crop1) => {
      const row: any = { Crop: crop1.name };
      crops.forEach((crop2) => {
        const entry = correlationMatrix.find(
          m => m.crop1 === crop1.name && m.crop2 === crop2.name
        );
        row[crop2.name] = entry?.correlation.toFixed(2) ?? '0.00';
      });
      data.push(row);
    });
    downloadCSV(data, 'crop_correlation_matrix');
  };

  if (crops.length === 0) {
    return (
      <div className="card-elevated p-6">
        <p className="text-muted-foreground text-center">No crop data available</p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6" id="correlation-heatmap">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Price Correlation Matrix
          </h3>
          <p className="text-sm text-muted-foreground">
            How crop prices move together
          </p>
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
                exportCorrelationData();
                toast.success('Correlation data exported to CSV');
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Data (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await exportChartToPDF('correlation-heatmap', 'Crop Price Correlation Matrix');
                toast.success('Heatmap exported to PDF');
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Export Chart (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-5 w-5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Correlation shows how prices of different crops move together. 
                  +1 means they move in the same direction, -1 means opposite directions.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header row */}
          <div className="flex">
            <div className="w-24 shrink-0" />
            {crops.map(crop => (
              <div 
                key={crop.id}
                className="w-16 h-16 flex items-center justify-center text-xs font-medium text-muted-foreground p-1"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">{crop.icon}</span>
                  <span className="truncate max-w-full">{crop.name.slice(0, 6)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {crops.map((rowCrop, rowIndex) => (
            <div key={rowCrop.id} className="flex">
              <div className="w-24 shrink-0 flex items-center gap-2 pr-2">
                <span className="text-lg">{rowCrop.icon}</span>
                <span className="text-xs font-medium text-foreground truncate">
                  {rowCrop.name}
                </span>
              </div>
              {crops.map((colCrop, colIndex) => {
                const entry = correlationMatrix.find(
                  m => m.crop1 === rowCrop.name && m.crop2 === colCrop.name
                );
                const correlation = entry?.correlation ?? 0;
                
                return (
                  <TooltipProvider key={`${rowCrop.id}-${colCrop.id}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-16 h-12 flex items-center justify-center text-xs font-medium rounded-sm m-0.5 cursor-pointer transition-transform hover:scale-105",
                            getCorrelationColor(correlation)
                          )}
                        >
                          {correlation.toFixed(2)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {rowCrop.name} ↔ {colCrop.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getCorrelationLabel(correlation)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/70" />
          <span className="text-xs text-muted-foreground">Strong -</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/50" />
          <span className="text-xs text-muted-foreground">Moderate -</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted" />
          <span className="text-xs text-muted-foreground">None</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/50" />
          <span className="text-xs text-muted-foreground">Moderate +</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/80" />
          <span className="text-xs text-muted-foreground">Strong +</span>
        </div>
      </div>
    </div>
  );
};
