import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-900',
  gold:    'bg-gold-500 text-gray-900 hover:bg-gold-400',
  outline: 'bg-transparent text-green-700 border-2 border-green-700 hover:bg-green-700 hover:text-white',
  ghost:   'bg-transparent text-green-700 hover:bg-cream-50',
  danger:  'bg-red-500 text-white hover:bg-red-600'
};
const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base'
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, ...rest }, ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-semibold transition shadow-sm',
        VARIANTS[variant], SIZES[size], className
      )}
      {...rest}
    />
  );
});
