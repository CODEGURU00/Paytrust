import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({
  src,
  alt,
  fallback,
  className,
  size = 'md',
  ...props
}: AvatarProps) {
  const sizes = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <div className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn('aspect-square h-full w-full object-cover', sizes[size])}
          {...props}
        />
      ) : (
        <div className={cn('aspect-square h-full w-full flex items-center justify-center bg-gray-100 text-gray-600 font-medium', sizes[size])}>
          {fallback || '?'}
        </div>
      )}
    </div>
  );
}
