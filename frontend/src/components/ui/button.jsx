import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring',
        link: 'text-primary-600 underline-offset-4 hover:underline p-0 h-auto focus:ring-primary-500',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
        warning:
          'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-xs rounded-md',
        default: 'h-10 px-4 py-2.5',
        lg: 'h-12 px-6 py-3 text-base',
        xl: 'h-14 px-8 py-4 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0 rounded-md',
        'icon-lg': 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
