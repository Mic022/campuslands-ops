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
  const baseClasses = 'relative inline-flex items-center justify-center font-bold tracking-wide rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#030712] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95'

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3 gap-2.5'
  }[size]

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 focus:ring-indigo-500 border border-white/10',
    cyan: 'bg-gradient-to-r from-[#00F5FF] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#00F5FF] text-slate-950 font-black shadow-lg shadow-cyan-500/30 focus:ring-cyan-400 border border-cyan-300/40',
    violet: 'bg-gradient-to-r from-[#9D4EDD] via-[#7B2CBF] to-[#5A189A] hover:from-[#C77DFF] hover:to-[#7B2CBF] text-white shadow-lg shadow-purple-600/30 focus:ring-purple-500 border border-purple-400/30',
    pink: 'bg-gradient-to-r from-[#FF007A] to-[#E0006C] hover:from-[#ff3399] hover:to-[#FF007A] text-white shadow-lg shadow-pink-600/30 focus:ring-pink-500 border border-pink-400/30',
    danger: 'bg-gradient-to-r from-[#FF2A55] to-[#D90429] hover:from-[#ff4d73] hover:to-[#FF2A55] text-white shadow-lg shadow-rose-600/30 focus:ring-rose-500 border border-rose-400/30',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white focus:ring-slate-700',
    outline: 'border border-white/15 hover:border-cyan-400/60 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-cyan-300 focus:ring-cyan-400 backdrop-blur-md'
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
