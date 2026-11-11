import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'success'
  | 'cyan';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-brand text-white shadow-[0_10px_26px_-12px_rgba(76,125,255,0.95)] hover:bg-brand-bright active:bg-brand-deep',
  primary:
    'bg-brand text-white shadow-[0_10px_26px_-12px_rgba(76,125,255,0.95)] hover:bg-brand-bright active:bg-brand-deep',
  secondary:
    'border border-line bg-panel-soft text-ink-soft hover:border-line-strong hover:bg-panel-hover hover:text-ink',
  outline:
    'border border-line-strong bg-transparent text-ink-soft hover:border-[#34507c] hover:bg-panel-soft hover:text-ink',
  ghost:
    'bg-transparent text-muted hover:bg-white/[0.055] hover:text-ink',
  destructive:
    'bg-red text-[#2a0b10] font-semibold hover:bg-red-soft active:bg-[#e45d6d]',
  danger:
    'border border-red/30 bg-red/10 text-red-soft hover:border-red/50 hover:bg-red/15',
  success:
    'border border-green/30 bg-green/10 text-green-soft hover:border-green/50 hover:bg-green/15',
  cyan:
    'bg-cyan text-[#04222d] font-semibold shadow-[0_10px_26px_-14px_rgba(34,211,238,0.9)] hover:bg-cyan-soft',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] rounded-md',
  sm: 'h-9 px-3 text-[13px] rounded-[9px]',
  md: 'h-10 px-4 text-sm rounded-[10px]',
  lg: 'h-12 px-6 text-[15px] rounded-xl',
  icon: 'h-10 w-10 p-0 rounded-[10px]',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg',
  'icon-lg': 'h-11 w-11 p-0 rounded-xl',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45 active:translate-y-[0.5px]',
          variantClasses[variant] || variantClasses.primary,
          sizeClasses[size] || sizeClasses.md,
          className
        )}
        ref={ref}
        disabled={asChild ? undefined : disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
