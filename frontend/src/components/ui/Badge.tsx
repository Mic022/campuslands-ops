import React from 'react'

interface BadgeProps {
  label: string
  variant?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'neutral'
  size?: 'sm' | 'md'
  showDot?: boolean
}

const variantStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  emerald: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400 shadow-[0_0_8px_#10B981]',
    border: 'border-emerald-500/30'
  },
  amber: {
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    dot: 'bg-amber-400 shadow-[0_0_8px_#F59E0B]',
    border: 'border-amber-500/30'
  },
  rose: {
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    dot: 'bg-rose-400 shadow-[0_0_8px_#EF4444]',
    border: 'border-rose-500/30'
  },
  sky: {
    bg: 'bg-sky-950/60',
    text: 'text-sky-400',
    dot: 'bg-sky-400 shadow-[0_0_8px_#38BDF8]',
    border: 'border-sky-500/30'
  },
  violet: {
    bg: 'bg-purple-950/60',
    text: 'text-purple-400',
    dot: 'bg-purple-400 shadow-[0_0_8px_#8B5CF6]',
    border: 'border-purple-500/30'
  },
  neutral: {
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    border: 'border-slate-700/50'
  }
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      <span className="capitalize">{label}</span>
    </span>
  )
}
