import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

/* The platform's own button: `.btn`, with `.pri` for the primary action,
   `.dgr` for destructive ones and `.sm` for the compact size used inside
   table rows (index.html:99-107). */
type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'pri',
  secondary: '',
  danger: 'dgr',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn('btn', VARIANT_CLASS[variant], size === 'sm' && 'sm', className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
