import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cyan' | 'violet' | 'danger' | 'ghost' | 'outline' | 'pink'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-semibold tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050816] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95'

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3 gap-2.5'
  }[size]

  // Rellenos sólidos y sobrios: el color comunica la acción, sin degradados de neón.
  const variantClasses = {
    primary: 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-lg shadow-sky-500/20 focus:ring-sky-300',
    cyan: 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-lg shadow-sky-500/20 focus:ring-sky-300',
    violet: 'bg-violet-500 hover:bg-violet-400 text-white shadow-lg shadow-violet-600/25 focus:ring-violet-400',
    pink: 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-600/25 focus:ring-rose-400',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-700/25 focus:ring-rose-400',
    ghost: 'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white focus:ring-slate-600',
    outline: 'border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] hover:border-sky-300/50 text-slate-200 hover:text-white focus:ring-sky-300'
  }[variant]

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Procesando...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}
