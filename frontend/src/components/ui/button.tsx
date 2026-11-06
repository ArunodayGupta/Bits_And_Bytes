import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
        'bg-moss-600 text-white dark:text-[#141915] hover:bg-moss-500 shadow-sm font-semibold',
        outline:
        'border border-hairline/80 bg-card/60 backdrop-blur-sm hover:bg-paper-2 hover:border-moss-500/50 text-ink shadow-xs',
        secondary:
        'bg-paper-2 text-ink hover:bg-moss-100/40 border border-hairline shadow-xs',
        ghost:
          'hover:bg-paper-2 text-ink',
        link:
        'text-teal-700 underline-offset-4 hover:underline dark:text-teal-400',
        glass:
        'bg-white/10 backdrop-blur-md border border-white/20 text-ink hover:bg-white/20 shadow-glass',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-full px-3 text-xs',
        lg: 'h-12 rounded-full px-8 text-base',
        icon: 'h-9 w-9 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
