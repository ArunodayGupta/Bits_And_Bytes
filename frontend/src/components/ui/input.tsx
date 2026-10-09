import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-full border border-hairline bg-card px-4 py-2 text-sm text-ink ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
