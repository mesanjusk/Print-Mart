import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(({ className, type = 'text', startIcon, endIcon, error, ...props }, ref) => {
  if (startIcon || endIcon) {
    return (
      <div className="relative">
        {startIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            startIcon && 'pl-9',
            endIcon && 'pr-9',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {endIcon}
          </div>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
