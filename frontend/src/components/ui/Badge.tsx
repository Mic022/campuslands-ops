import React from 'react'

interface BadgeProps {
  label: string
  variant?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'neutral'
  size?: 'sm' | 'md'
  showDot?: boolean
}

const variantStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  emerald: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-400/30' },
  amber: { bg: 'bg-amber-400/10', text: 'text-amber-300', dot: 'bg-amber-400', border: 'border-amber-400/30' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-400', border: 'border-rose-400/30' },
  sky: { bg: 'bg-sky-400/10', text: 'text-sky-300', dot: 'bg-sky-400', border: 'border-sky-400/30' },
  violet: { bg: 'bg-violet-400/10', text: 'text-violet-300', dot: 'bg-violet-400', border: 'border-violet-400/30' },
  neutral: { bg: 'bg-white/5', text: 'text-slate-300', dot: 'bg-slate-400', border: 'border-white/10' }
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral
  const sizeClass = size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      <span className="capitalize tracking-wider">{label}</span>
    </span>
  )
}
