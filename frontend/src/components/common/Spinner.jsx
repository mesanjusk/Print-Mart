import { cn } from '../../lib/utils';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div
        className={cn(
          'rounded-full border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400 animate-spin',
          sizes[size]
        )}
      />
    </div>
  );
}
