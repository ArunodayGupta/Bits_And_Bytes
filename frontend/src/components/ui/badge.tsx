import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-moss-600 text-paper hover:bg-moss-500',
        secondary:
          'border-hairline bg-paper-2 text-ink',
        outline:
          'border-hairline text-ink',
        verified:
          'border-moss-500 bg-moss-100 text-moss-600 font-semibold',
        mono:
          'border-hairline bg-paper-2 font-mono text-[11px] tracking-wider text-ink',
        clinical:
          'border-teal-700/30 bg-teal-700/10 text-teal-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
