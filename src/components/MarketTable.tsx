import { TrendingUp, TrendingDown, Download, FileSpreadsheet } from 'lucide-react';
import { useMarketData } from '@/hooks/useCropData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { exportMarketDataToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';

export const MarketTable = () => {
  const { data: marketData = [], isLoading, error } = useMarketData();

  if (error) {
    return (
      <div className="card-elevated p-6">
        <p className="text-destructive text-center">Failed to load market data</p>
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Regional Market Prices</h3>
          <p className="text-sm text-muted-foreground">Latest prices from major APMC markets across India</p>
        </div>
        {marketData.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => {
              exportMarketDataToCSV(marketData);
              toast.success('Market data exported to CSV');
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Crop</TableHead>
              <TableHead className="font-semibold">Region</TableHead>
              <TableHead className="font-semibold text-right">Price (₹/qtl)</TableHead>
              <TableHead className="font-semibold text-right">Change</TableHead>
              <TableHead className="font-semibold text-right">Volume (tons)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 ml-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </>
            ) : marketData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No market data available. Click "Refresh Data" to generate predictions.
                </TableCell>
              </TableRow>
            ) : (
              marketData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{item.crop}</TableCell>
                  <TableCell className="text-muted-foreground">{item.region}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                      item.change >= 0 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {item.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {item.change >= 0 ? '+' : ''}{item.change}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.volume.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
