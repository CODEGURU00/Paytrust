import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  children?: React.ReactNode;
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-blue-600 text-white',
    secondary: 'border-transparent bg-gray-100 text-gray-900',
    success: 'border-transparent bg-green-100 text-green-800',
    warning: 'border-transparent bg-yellow-100 text-yellow-800',
    destructive: 'border-transparent bg-red-100 text-red-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
