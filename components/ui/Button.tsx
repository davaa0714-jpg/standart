'use client'
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary', size = 'md', loading, className, children, disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center gap-2 font-medium rounded transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border'
  const variants = {
    primary:   'bg-accent text-white border-accent hover:bg-accent-light hover:border-accent-light',
    secondary: 'bg-surface2 text-tx border-border hover:border-border2 hover:bg-surface3',
    danger:    'bg-transparent text-danger-light border-border hover:bg-danger/10 hover:border-danger',
    ghost:     'bg-transparent text-tx2 border-transparent hover:bg-surface3 hover:text-tx',
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  }
  return (
    <button ref={ref} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'
