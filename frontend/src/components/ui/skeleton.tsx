import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-20 bg-paper-2/80 border border-hairline/50',
        className
      )}
      {...props}
    />
  );
}
