import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  variant?: 'default' | 'primary' | 'accent';
}

export const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: StatCardProps) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={cn(
      "card-glow p-6",
      variant === 'primary' && "bg-primary text-primary-foreground",
      variant === 'accent' && "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            variant === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-3xl font-bold font-display",
            variant === 'primary' ? "text-primary-foreground" : "text-foreground"
          )}>
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className={cn(
                "text-sm",
                variant === 'primary' ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                vs last week
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          variant === 'primary' 
            ? "bg-primary-foreground/20" 
            : variant === 'accent'
            ? "bg-accent/30"
            : "bg-muted"
        )}>
          <Icon className={cn(
            "h-6 w-6",
            variant === 'primary' 
              ? "text-primary-foreground" 
              : variant === 'accent'
              ? "text-accent-foreground"
              : "text-primary"
          )} />
        </div>
      </div>
    </div>
  );
};
