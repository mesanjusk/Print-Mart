import { cn, formatNumber } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor = 'text-primary-600', iconBg = 'bg-primary-50 dark:bg-primary-900/20', className }) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-1.5 text-xs">
              {change !== undefined && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 font-medium',
                    isPositive && 'text-emerald-600 dark:text-emerald-400',
                    isNegative && 'text-red-600 dark:text-red-400',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                >
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : null}
                  {isPositive ? '+' : ''}{change}%
                </span>
              )}
              {changeLabel && (
                <span className="text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}

export { StatCard };
